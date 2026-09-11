import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const stamp = Date.now();
const password = 'WorkflowTest!234';
const emails = [
  'workflow-farmer',
  'workflow-vet',
  'workflow-other-vet',
  'workflow-pending-vet',
  'workflow-outsider',
  'workflow-admin',
  'workflow-worker',
].map((x) => `${x}-${stamp}@example.test`);
const ids = {};
let farmId, animalId, requestId, caseId, diagnosisId, prescriptionId, treatmentId;
const app = createApp();
async function login(email) {
  return (await request(app).post('/api/v1/auth/login').send({ email, password })).body.data
    .accessToken;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe.sequential('complete veterinary workflow', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash(password);
    for (let i = 0; i < emails.length; i++)
      ids[emails[i]] = (
        await prisma.user.create({
          data: {
            email: emails[i],
            fullName: [
              'Workflow Farmer',
              'Assigned Veterinarian',
              'Other Veterinarian',
              'Pending Veterinarian',
              'Unrelated User',
              'Platform Administrator',
              'Farm Worker',
            ][i],
            passwordHash,
          },
        })
      ).id;
    await prisma.userPlatformRole.create({
      data: { userId: ids[emails[5]], role: 'PLATFORM_ADMIN' },
    });
    await prisma.userPlatformRole.createMany({
      data: emails.slice(1, 4).map((email) => ({ userId: ids[email], role: 'VETERINARIAN' })),
    });
    const profiles = [];
    for (const [index, email] of emails.slice(1, 4).entries())
      profiles.push(
        await prisma.veterinarianProfile.create({
          data: {
            userId: ids[email],
            registrationNumber: `WF-${stamp}-${index}`,
            registrationCouncil: 'Workflow Test Council',
            qualification: 'B.V.Sc. & A.H.',
            specialization: 'Bovine medicine',
            experienceYears: 5,
            status: index === 2 ? 'PENDING' : 'VERIFIED',
            reviewNotes: 'PRIVATE REVIEW NOTE',
            serviceAreas: { create: { state: 'Karnataka', district: 'Mysuru' } },
          },
        }),
      );
    ids.assignedVetProfile = profiles[0].id;
    ids.otherVetProfile = profiles[1].id;
    ids.pendingVetProfile = profiles[2].id;
    const species = await prisma.species.findUnique({ where: { code: 'BOS_TAURUS' } });
    const farm = await prisma.farm.create({
      data: {
        name: 'Workflow Farm',
        status: 'ACTIVE',
        state: 'Karnataka',
        district: 'Mysuru',
        createdById: ids[emails[0]],
        members: {
          create: {
            userId: ids[emails[0]],
            status: 'ACTIVE',
            joinedAt: new Date(),
            roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
          },
        },
      },
    });
    farmId = farm.id;
    await prisma.farmMember.createMany({
      data: [
        { farmId, userId: ids[emails[1]], status: 'ACTIVE', joinedAt: new Date() },
        { farmId, userId: ids[emails[6]], status: 'ACTIVE', joinedAt: new Date() },
      ],
    });
    const mixedMember = await prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: ids[emails[1]] } },
    });
    const workerMember = await prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: ids[emails[6]] } },
    });
    await prisma.farmMemberRole.createMany({
      data: [
        { farmMemberId: mixedMember.id, role: 'FARM_WORKER' },
        { farmMemberId: workerMember.id, role: 'FARM_WORKER' },
      ],
    });
    animalId = (
      await prisma.animal.create({
        data: {
          farmId,
          speciesId: species.id,
          tagNumber: `WF-${stamp}`,
          sex: 'FEMALE',
          lactating: true,
        },
      })
    ).id;
  });
  it('returns roleless, worker, veterinarian, admin, and mixed authorization contexts', async () => {
    const contexts = await Promise.all(
      [emails[4], emails[6], emails[3], emails[5], emails[1]].map((email) =>
        request(app).post('/api/v1/auth/login').send({ email, password }),
      ),
    );
    expect(contexts[0].body.data.user).toMatchObject({
      platformRoles: [],
      farmMemberships: [],
      veterinarian: { exists: false, status: null },
    });
    expect(contexts[1].body.data.user.farmMemberships[0].roles).toEqual(['FARM_WORKER']);
    expect(contexts[2].body.data.user).toMatchObject({
      platformRoles: ['VETERINARIAN'],
      veterinarian: { exists: true, status: 'PENDING' },
    });
    expect(contexts[3].body.data.user.platformRoles).toContain('PLATFORM_ADMIN');
    expect(contexts[4].body.data.user.platformRoles).toContain('VETERINARIAN');
    expect(contexts[4].body.data.user.veterinarian.status).toBe('VERIFIED');
    expect(contexts[4].body.data.user.farmMemberships[0].roles).toContain('FARM_WORKER');
  });
  afterAll(async () => {
    if (farmId) {
      await prisma.eligibilityTreatmentEvaluation.deleteMany({
        where: { eligibilityCheck: { farmId } },
      });
      await prisma.milkEligibilityCheck.deleteMany({ where: { farmId } });
      await prisma.treatmentAdministration.deleteMany({ where: { treatment: { farmId } } });
      await prisma.treatment.deleteMany({ where: { farmId } });
      await prisma.prescriptionItem.deleteMany({ where: { prescription: { case: { farmId } } } });
      await prisma.prescription.deleteMany({ where: { case: { farmId } } });
      await prisma.diagnosis.deleteMany({ where: { case: { farmId } } });
      await prisma.caseMessage.deleteMany({ where: { case: { farmId } } });
      await prisma.veterinaryCase.deleteMany({ where: { farmId } });
      await prisma.treatmentRequest.deleteMany({ where: { farmId } });
      await prisma.animalProfileEvent.deleteMany({ where: { animal: { farmId } } });
      await prisma.animal.deleteMany({ where: { farmId } });
      await prisma.farm.delete({ where: { id: farmId } });
    }
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });
  it('discovers only verified veterinarians without private review data', async () => {
    const token = await login(emails[0]);
    const result = await request(app)
      .get('/api/v1/veterinarians?district=Mysuru&specialization=Bovine')
      .set(auth(token));
    expect(result.status).toBe(200);
    expect(result.body.data.veterinarians.length).toBeGreaterThanOrEqual(2);
    expect(result.body.data.veterinarians.map((profile) => profile.user.fullName)).toEqual(
      expect.arrayContaining(['Assigned Veterinarian', 'Other Veterinarian']),
    );
    expect(JSON.stringify(result.body)).not.toContain('PRIVATE REVIEW NOTE');
    expect(JSON.stringify(result.body)).not.toContain('objectKey');
  });
  it('enforces request ownership, verification, transitions, and idempotent case creation', async () => {
    const farmer = await login(emails[0]);
    const outsider = await login(emails[4]);
    const pending = await request(app).post('/api/v1/treatment-requests').set(auth(farmer)).send({
      farmId,
      animalId,
      requestedVeterinarianId: ids.pendingVetProfile,
      observations: 'Reduced appetite and visible discomfort',
      urgency: 'SOON',
    });
    expect(pending.status).toBe(400);
    expect(
      (
        await request(app).post('/api/v1/treatment-requests').set(auth(outsider)).send({
          farmId,
          animalId,
          requestedVeterinarianId: ids.assignedVetProfile,
          observations: 'Unauthorized request',
        })
      ).status,
    ).toBe(404);
    const created = await request(app).post('/api/v1/treatment-requests').set(auth(farmer)).send({
      farmId,
      animalId,
      requestedVeterinarianId: ids.assignedVetProfile,
      observations: 'Reduced appetite and visible discomfort',
      symptoms: 'Mild swelling',
      urgency: 'SOON',
    });
    expect(created.status).toBe(201);
    requestId = created.body.data.request.id;
    const worker = await login(emails[6]);
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-requests/${requestId}/status`)
          .set(auth(worker))
          .send({ status: 'CANCELLED' })
      ).status,
    ).toBe(403);
    const otherVet = await login(emails[2]);
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-requests/${requestId}/status`)
          .set(auth(otherVet))
          .send({ status: 'ACCEPTED' })
      ).status,
    ).toBe(403);
    const vet = await login(emails[1]);
    const [farmScope, veterinarianScope] = await Promise.all([
      request(app).get(`/api/v1/treatment-requests?scope=FARM&farmId=${farmId}`).set(auth(vet)),
      request(app).get('/api/v1/treatment-requests?scope=VETERINARIAN').set(auth(vet)),
    ]);
    expect(farmScope.status).toBe(200);
    expect(veterinarianScope.status).toBe(200);
    expect(farmScope.body.data.requests.some((item) => item.id === requestId)).toBe(true);
    expect(veterinarianScope.body.data.requests.some((item) => item.id === requestId)).toBe(true);
    const accepted = await request(app)
      .patch(`/api/v1/treatment-requests/${requestId}/status`)
      .set(auth(vet))
      .send({ status: 'ACCEPTED' });
    expect(accepted.status).toBe(200);
    caseId = accepted.body.data.veterinaryCase.id;
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-requests/${requestId}/status`)
          .set(auth(vet))
          .send({ status: 'ACCEPTED' })
      ).status,
    ).toBe(409);
    expect(await prisma.veterinaryCase.count({ where: { requestId } })).toBe(1);
    expect(
      (await request(app).get(`/api/v1/veterinary-cases/${caseId}`).set(auth(outsider))).status,
    ).toBe(404);
  });
  it('protects the veterinarian dashboard and exposes pending status without clinical access', async () => {
    const outsider = await login(emails[4]);
    expect(
      (await request(app).get('/api/v1/dashboards/veterinarian').set(auth(outsider))).status,
    ).toBe(403);
    const pending = await login(emails[3]);
    const dashboard = await request(app).get('/api/v1/dashboards/veterinarian').set(auth(pending));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data).toMatchObject({
      veterinarianStatus: 'PENDING',
      clinicalAccess: false,
    });
  });
  it('allows only participants to chat and only the assigned vet to diagnose and prescribe', async () => {
    const farmer = await login(emails[0]);
    const vet = await login(emails[1]);
    const otherVet = await login(emails[2]);
    const outsider = await login(emails[4]);
    expect(
      (
        await request(app)
          .post(`/api/v1/veterinary-cases/${caseId}/messages`)
          .set(auth(farmer))
          .send({ body: 'The animal is still eating less.' })
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .post(`/api/v1/veterinary-cases/${caseId}/messages`)
          .set(auth(vet))
          .send({ body: 'Please monitor temperature until visit.' })
      ).status,
    ).toBe(201);
    expect(
      (await request(app).get(`/api/v1/veterinary-cases/${caseId}/messages`).set(auth(outsider)))
        .status,
    ).toBe(404);
    const disease = await prisma.disease.findUnique({ where: { code: 'COND-MASTITIS-CLINICAL' } });
    expect(
      (
        await request(app)
          .post(`/api/v1/veterinary-cases/${caseId}/diagnoses`)
          .set(auth(farmer))
          .send({ clinicalNotes: 'Not permitted' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/v1/veterinary-cases/${caseId}/diagnoses`)
          .set(auth(otherVet))
          .send({ clinicalNotes: 'Not assigned' })
      ).status,
    ).toBe(403);
    const diagnosed = await request(app)
      .post(`/api/v1/veterinary-cases/${caseId}/diagnoses`)
      .set(auth(vet))
      .send({
        diseaseId: disease.id,
        clinicalNotes: 'Clinical assessment recorded by assigned veterinarian',
        followUpNotes: 'Review after course',
      });
    expect(diagnosed.status).toBe(201);
    diagnosisId = diagnosed.body.data.diagnosis.id;
    const drug = await prisma.drug.findUnique({ where: { code: 'AMOXICILLIN' } });
    const payload = {
      diagnosisId,
      startDate: new Date().toISOString(),
      instructions: 'Veterinarian-entered instructions',
      items: [
        {
          drugId: drug.id,
          doseValue: 5,
          doseUnit: 'mL',
          route: 'IM',
          frequency: 'Once daily',
          durationValue: 3,
          durationUnit: 'days',
          startDate: new Date().toISOString(),
          instructions: 'Do not infer as reference dosage',
        },
      ],
    };
    expect(
      (
        await request(app)
          .post(`/api/v1/veterinary-cases/${caseId}/prescriptions`)
          .set(auth(farmer))
          .send(payload)
      ).status,
    ).toBe(403);
    const prescribed = await request(app)
      .post(`/api/v1/veterinary-cases/${caseId}/prescriptions`)
      .set(auth(vet))
      .send(payload);
    expect(prescribed.status).toBe(201);
    prescriptionId = prescribed.body.data.prescription.id;
    ids.prescriptionItemId = prescribed.body.data.prescription.items[0].id;
    ids.drugId = drug.id;
    expect(await prisma.treatmentAdministration.count({ where: { animalId } })).toBe(0);
  });
  it('tracks treatment transitions and actual administrations separately with timeline events', async () => {
    const vet = await login(emails[1]);
    const created = await request(app)
      .post('/api/v1/treatments')
      .set(auth(vet))
      .send({ caseId, prescriptionId, notes: 'Course created from prescription' });
    expect(created.status).toBe(201);
    treatmentId = created.body.data.treatment.id;
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatments/${treatmentId}/status`)
          .set(auth(vet))
          .send({ status: 'COMPLETED' })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatments/${treatmentId}/status`)
          .set(auth(vet))
          .send({ status: 'ACTIVE' })
      ).status,
    ).toBe(200);
    const bad = await request(app)
      .post(`/api/v1/treatments/${treatmentId}/administrations`)
      .set(auth(vet))
      .send({
        prescriptionItemId: ids.prescriptionItemId,
        drugId: (await prisma.drug.findUnique({ where: { code: 'CEFTIOFUR' } })).id,
        amount: 5,
        amountUnit: 'mL',
        route: 'IM',
        administeredAt: new Date().toISOString(),
      });
    expect(bad.status).toBe(400);
    const administration = await request(app)
      .post(`/api/v1/treatments/${treatmentId}/administrations`)
      .set(auth(vet))
      .send({
        prescriptionItemId: ids.prescriptionItemId,
        drugId: ids.drugId,
        amount: 5,
        amountUnit: 'mL',
        route: 'IM',
        administeredAt: new Date().toISOString(),
        notes: 'Actually administered',
      });
    expect(administration.status).toBe(201);
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatments/${treatmentId}/status`)
          .set(auth(vet))
          .send({ status: 'COMPLETED', notes: 'Course completed' })
      ).status,
    ).toBe(200);
    const farmer = await login(emails[0]);
    const timeline = await request(app)
      .get(`/api/v1/farms/${farmId}/animals/${animalId}/timeline`)
      .set(auth(farmer));
    expect(timeline.status).toBe(200);
    const types = timeline.body.data.events.map((e) => e.eventType);
    expect(types).toContain('TREATMENT_REQUEST_CREATED');
    expect(types).toContain('DIAGNOSIS_RECORDED');
    expect(types).toContain('PRESCRIPTION_ISSUED');
    expect(types).toContain('TREATMENT_ADMINISTERED');
    expect(types).toContain('TREATMENT_COMPLETED');
  });
  it('authorizes AMU scope and stores idempotent fail-safe eligibility', async () => {
    const farmer = await login(emails[0]);
    const outsider = await login(emails[4]);
    const admin = await login(emails[5]);
    const farmSummary = await request(app)
      .get(`/api/v1/amu/summary?farmId=${farmId}`)
      .set(auth(farmer));
    expect(farmSummary.status).toBe(200);
    expect(farmSummary.body.data.summary.totalAdministrations).toBe(1);
    expect(
      (await request(app).get(`/api/v1/amu/summary?farmId=${farmId}`).set(auth(outsider))).status,
    ).toBe(404);
    expect((await request(app).get('/api/v1/amu/by-farm').set(auth(admin))).status).toBe(200);
    const first = await request(app)
      .post(`/api/v1/eligibility/animals/${animalId}/evaluate`)
      .set(auth(farmer));
    const second = await request(app)
      .post(`/api/v1/eligibility/animals/${animalId}/evaluate`)
      .set(auth(farmer));
    expect(first.status).toBe(200);
    expect(first.body.data.eligibility.status).toBe('REVIEW_REQUIRED');
    expect(second.body.data.eligibility.id).toBe(first.body.data.eligibility.id);
    expect(
      (
        await request(app)
          .post(`/api/v1/eligibility/animals/${animalId}/evaluate`)
          .set(auth(outsider))
      ).status,
    ).toBe(404);
    const mrl = await request(app).get('/api/v1/reference-data/mrl').set(auth(farmer));
    expect(mrl.status).toBe(200);
    expect(mrl.body.data.usageConstraint).toContain('NO_MEASUREMENT');
  });
});
