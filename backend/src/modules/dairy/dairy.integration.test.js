import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const app = createApp();

let farmerUser;
let dairyUser;
let dairyProfile;
let farm;
let testCertificateNumber;
let testVerificationId;
let enrollmentId;

describe.sequential('dairy farmer request, certificate verification and milk sales', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('TestPass!123');

    // Create farmer user
    farmerUser = await prisma.user.create({
      data: {
        email: `farmer-${stamp}@test.local`,
        fullName: `Farmer ${stamp}`,
        passwordHash,
      },
    });

    // Create farm for farmer
    farm = await prisma.farm.create({
      data: {
        name: `Sunrise Farm ${stamp}`,
        state: 'Maharashtra',
        district: 'Kolhapur',
        status: 'ACTIVE',
        createdById: farmerUser.id,
      },
    });

    // Create farmer profile
    await prisma.farmerProfile.create({
      data: {
        userId: farmerUser.id,
        farmName: farm.name,
        farmerIdNumber: `FRM-TEST-${stamp.slice(0, 8)}`,
        state: 'Maharashtra',
        district: 'Kolhapur',
        status: 'VERIFIED',
      },
    });

    // Create dairy operator user
    dairyUser = await prisma.user.create({
      data: {
        email: `dairy-${stamp}@test.local`,
        fullName: `Dairy Operator ${stamp}`,
        passwordHash,
        platformRoles: {
          create: [{ role: 'DAIRY_OWNER' }],
        },
      },
    });

    // Create dairy profile
    dairyProfile = await prisma.dairyOwnerProfile.create({
      data: {
        userId: dairyUser.id,
        dairyName: `Gokul Valley Dairy ${stamp}`,
        fssaiLicenseNumber: `FSSAI-${stamp.slice(0, 10)}`,
        state: 'Maharashtra',
        district: 'Kolhapur',
        operationalArea: 'Kolhapur Center',
        dailyCapacityLiters: 25000,
        status: 'VERIFIED',
      },
    });

    // Mock certificate / daily clearance
    testCertificateNumber = `DMC-${stamp.slice(0, 10)}`;
    testVerificationId = `v_${stamp.slice(0, 12)}`;

    // Create a dummy clearance evaluation and clearance record
    const evalRecord = await prisma.dailyFarmEligibilityEvaluation.create({
      data: {
        farmId: farm.id,
        businessDate: new Date(),
        status: 'CURRENT',
        version: 1,
        timeZone: 'Asia/Kolkata',
        applicableCount: 2,
        eligibleCount: 2,
        blockedCount: 0,
        canonicalPayload: {
          farm: { id: farm.id, name: farm.name },
          businessDate: new Date().toISOString().split('T')[0],
          eligibleCount: 2,
          applicableCount: 2,
          animals: [
            { animalTag: 'C101', animalName: 'Cow 101', eligibilityStatus: 'ELIGIBLE_FOR_MILK' },
            { animalTag: 'C102', animalName: 'Cow 102', eligibilityStatus: 'ELIGIBLE_FOR_MILK' },
          ],
        },
        snapshotHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    });

    await prisma.dailyMilkCollectionClearance.create({
      data: {
        evaluationId: evalRecord.id,
        clearanceNumber: testCertificateNumber,
        verificationId: testVerificationId,
        canonicalPayload: evalRecord.canonicalPayload,
        canonicalizationVersion: 'SIH-DAILY-CLEARANCE-1.0',
        contentHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        disclaimer: 'Verified withdrawal clearance test proof.',
      },
    });
  });

  afterAll(async () => {
    // Cleanup records created for this test
    if (enrollmentId) {
      await prisma.$executeRawUnsafe(
        'DELETE FROM `dairy_milk_intakes` WHERE `enrollmentId` = ?',
        enrollmentId,
      );
      await prisma.$executeRawUnsafe(
        'DELETE FROM `dairy_farmer_enrollments` WHERE `id` = ?',
        enrollmentId,
      );
    }
    await prisma.dailyMilkCollectionClearance.deleteMany({
      where: { verificationId: testVerificationId },
    });
    await prisma.dailyFarmEligibilityEvaluation.deleteMany({ where: { farmId: farm.id } });
    await prisma.farmerProfile.deleteMany({ where: { userId: farmerUser.id } });
    await prisma.farm.deleteMany({ where: { id: farm.id } });
    await prisma.dairyOwnerProfile.deleteMany({ where: { userId: dairyUser.id } });
    await prisma.userPlatformRole.deleteMany({ where: { userId: dairyUser.id } });
    await prisma.user.deleteMany({ where: { id: { in: [farmerUser.id, dairyUser.id] } } });
  });

  it('1. returns available verified dairies', async () => {
    const token = signAccessToken(farmerUser.id);
    const response = await request(app)
      .get('/api/v1/dairy/dairies')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.dairies).toBeDefined();
    const found = response.body.data.dairies.find((d) => d.userId === dairyUser.id);
    expect(found).toBeDefined();
    expect(found.dairyName).toBe(dairyProfile.dairyName);
  });

  it('2. farmer submits join request with certificate', async () => {
    const token = signAccessToken(farmerUser.id);
    const response = await request(app)
      .post('/api/v1/dairy/farmer/join-request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dairyUserId: dairyUser.id,
        farmName: farm.name,
        milkType: 'COW',
        expectedDailyQuantity: 30,
        agreedRatePerLiter: 43.5,
        certificateNumber: testCertificateNumber,
        certificateVerificationId: testVerificationId,
        joinRequestNotes: 'Morning fresh milk supply request.',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('PENDING_APPROVAL');
    enrollmentId = response.body.data.enrollmentId;
    expect(enrollmentId).toBeDefined();
  });

  it('3. farmer can view their submitted pending request', async () => {
    const token = signAccessToken(farmerUser.id);
    const response = await request(app)
      .get('/api/v1/dairy/farmer/my-requests')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const myReq = response.body.data.requests.find((r) => r.id === enrollmentId);
    expect(myReq).toBeDefined();
    expect(myReq.status).toBe('PENDING_APPROVAL');
    expect(myReq.certificateNumber).toBe(testCertificateNumber);
  });

  it('4. dairy operator inspects and verifies the certificate', async () => {
    const token = signAccessToken(dairyUser.id);
    const response = await request(app)
      .get(`/api/v1/dairy/certificates/verify/${testVerificationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.certificateNumber).toBe(testCertificateNumber);
    expect(response.body.data.documentIntegrity).toBe('VERIFIED');
    expect(response.body.data.eligibleCount).toBe(2);
    expect(response.body.data.animals).toHaveLength(2);
  });

  it('5. selling milk is blocked while request is pending approval', async () => {
    const token = signAccessToken(farmerUser.id);
    const response = await request(app)
      .post('/api/v1/dairy/farmer/sell-milk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dairyUserId: dairyUser.id,
        quantityLiters: 25,
        ratePerLiter: 43.5,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('REQUEST_PENDING');
  });

  it('6. dairy operator accepts request upon reviewing certificate', async () => {
    const token = signAccessToken(dairyUser.id);
    const response = await request(app)
      .put(`/api/v1/dairy/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'ACTIVE',
        agreedRatePerLiter: 44.0,
        joinRequestNotes: 'Approved after inspecting clean withdrawal certificate.',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ACTIVE');
  });

  it('7. farmer can now sell milk to accepted dairy', async () => {
    const token = signAccessToken(farmerUser.id);
    const response = await request(app)
      .post('/api/v1/dairy/farmer/sell-milk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dairyUserId: dairyUser.id,
        quantityLiters: 25,
        ratePerLiter: 44.0,
        milkType: 'COW',
        shift: 'MORNING',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.quantityLiters).toBe(25);
    expect(response.body.data.totalCost).toBe(1100); // 25 * 44.0
  });

  it('8. sale appears in farmer sales history and dairy intakes ledger', async () => {
    const farmerToken = signAccessToken(farmerUser.id);
    const salesRes = await request(app)
      .get('/api/v1/dairy/farmer/sales-history')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(salesRes.status).toBe(200);
    expect(salesRes.body.data.sales.length).toBeGreaterThanOrEqual(1);
    expect(salesRes.body.data.sales[0].totalCost).toBe(1100);

    const dairyToken = signAccessToken(dairyUser.id);
    const intakesRes = await request(app)
      .get('/api/v1/dairy/inventory/intakes')
      .set('Authorization', `Bearer ${dairyToken}`);

    expect(intakesRes.status).toBe(200);
    const foundIntake = intakesRes.body.data.intakes.find((i) => i.enrollmentId === enrollmentId);
    expect(foundIntake).toBeDefined();
    expect(foundIntake.quantityLiters).toBe(25);
  });
});
