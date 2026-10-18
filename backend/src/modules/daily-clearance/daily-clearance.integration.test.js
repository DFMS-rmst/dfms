import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { evaluateAndPersist } from '../withdrawal/service.js';
import { anchorDailyClearance, verifyDailyClearanceIntegrity } from '../blockchain/service.js';
import { runDailyEvaluation } from './service.js';

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const app = createApp();
let owner;
let worker;
let outsider;
let vetUser;
let vet;
let farm;
let eligibleAnimal;
let secondAnimal;

describe.sequential('daily milk collection clearance integration', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('DailyTest!234');
    [owner, worker, outsider, vetUser] = await Promise.all(
      ['owner', 'worker', 'outsider', 'vet'].map((name) =>
        prisma.user.create({
          data: {
            email: `daily-${name}-${stamp}@test.local`,
            fullName: `Daily ${name}`,
            passwordHash,
          },
        }),
      ),
    );
    vet = await prisma.veterinarianProfile.create({
      data: {
        userId: vetUser.id,
        registrationNumber: `DAILY-${stamp}`,
        registrationCouncil: 'Test Council',
        qualification: 'BVSc',
        status: 'VERIFIED',
      },
    });
    const species = await prisma.species.findFirstOrThrow();
    farm = await prisma.farm.create({
      data: {
        name: `Daily Farm ${stamp}`,
        state: 'Test State',
        district: 'Test District',
        status: 'ACTIVE',
        timeZone: 'Asia/Kolkata',
        createdById: owner.id,
        members: {
          create: [
            {
              userId: owner.id,
              status: 'ACTIVE',
              joinedAt: new Date(),
              roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
            },
            {
              userId: worker.id,
              status: 'ACTIVE',
              joinedAt: new Date(),
              roles: { create: { role: 'FARM_WORKER' } },
            },
          ],
        },
      },
    });
    [eligibleAnimal, secondAnimal] = await Promise.all(
      ['DAILY-A', 'DAILY-B'].map((tagNumber) =>
        prisma.animal.create({
          data: {
            farmId: farm.id,
            speciesId: species.id,
            tagNumber: `${tagNumber}-${stamp}`,
            sex: 'FEMALE',
            lactating: true,
            status: 'ACTIVE',
          },
        }),
      ),
    );
  });

  afterAll(async () => {
    const clearanceIds = (
      await prisma.dailyMilkCollectionClearance.findMany({
        where: { evaluation: { farmId: farm.id } },
        select: { id: true },
      })
    ).map((item) => item.id);
    await prisma.blockchainAnchor.deleteMany({ where: { recordId: { in: clearanceIds } } });
    await prisma.dailyMilkCollectionClearance.deleteMany({
      where: { evaluation: { farmId: farm.id } },
    });
    await prisma.dailyFarmEligibilityItem.deleteMany({
      where: { evaluation: { farmId: farm.id } },
    });
    await prisma.dailyFarmEligibilityEvaluation.updateMany({
      where: { farmId: farm.id },
      data: { supersededById: null },
    });
    await prisma.dailyFarmEligibilityEvaluation.deleteMany({ where: { farmId: farm.id } });
    await prisma.dailyEligibilityJob.deleteMany({ where: { farmId: farm.id } });
    await prisma.alert.deleteMany({ where: { farmId: farm.id } });
    await prisma.auditLog.deleteMany({ where: { farmId: farm.id } });
    await prisma.animalProfileEvent.deleteMany({
      where: { animalId: { in: [eligibleAnimal.id, secondAnimal.id] } },
    });
    await prisma.eligibilityTreatmentEvaluation.deleteMany({
      where: { eligibilityCheck: { farmId: farm.id } },
    });
    await prisma.milkEligibilityCheck.deleteMany({ where: { farmId: farm.id } });
    await prisma.treatment.deleteMany({ where: { farmId: farm.id } });
    await prisma.veterinaryCase.deleteMany({ where: { farmId: farm.id } });
    await prisma.treatmentRequest.deleteMany({ where: { farmId: farm.id } });
    await prisma.animal.deleteMany({ where: { farmId: farm.id } });
    await prisma.farmMember.deleteMany({ where: { farmId: farm.id } });
    await prisma.farm.delete({ where: { id: farm.id } });
    await prisma.veterinarianProfile.delete({ where: { id: vet.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, worker.id, outsider.id, vetUser.id] } },
    });
    await prisma.$disconnect();
  });

  it('creates one system-derived current version and deduplicates unchanged runs and alerts', async () => {
    const first = await runDailyEvaluation(farm.id, { actorUserId: owner.id, trigger: 'TEST' });
    const second = await runDailyEvaluation(farm.id, { actorUserId: owner.id, trigger: 'TEST' });
    expect(first.version).toBe(1);
    expect(first.eligibleCount).toBe(2);
    expect(first.items).toHaveLength(2);
    expect(first.items.every((item) => item.included)).toBe(true);
    expect(second.id).toBe(first.id);
    expect(await prisma.dailyFarmEligibilityEvaluation.count({ where: { farmId: farm.id } })).toBe(
      1,
    );
    expect(
      await prisma.alert.count({ where: { farmId: farm.id, type: 'DAILY_ELIGIBILITY_READY' } }),
    ).toBe(2);
    await expect(
      prisma.dailyFarmEligibilityEvaluation.create({
        data: {
          farmId: farm.id,
          businessDate: first.businessDate,
          timeZone: farm.timeZone,
          version: 99,
          applicableCount: 0,
          eligibleCount: 0,
          blockedCount: 0,
          snapshotHashSha256: '0'.repeat(64),
          canonicalPayload: {},
          currentSlot: `${farm.id}:${first.businessDate.toISOString().slice(0, 10)}`,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('allows worker read access, owner refresh, and blocks outsider and veterinarian access', async () => {
    const ownerToken = signAccessToken(owner.id);
    const workerToken = signAccessToken(worker.id);
    const outsiderToken = signAccessToken(outsider.id);
    const vetToken = signAccessToken(vetUser.id);
    expect(
      (
        await request(app)
          .get(`/api/v1/daily-clearances/today?farmId=${farm.id}`)
          .set('Authorization', `Bearer ${workerToken}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/v1/daily-clearances/run-today')
          .set('Authorization', `Bearer ${workerToken}`)
          .send({ farmId: farm.id })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/daily-clearances/run-today')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ farmId: farm.id })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/v1/daily-clearances/today?farmId=${farm.id}`)
          .set('Authorization', `Bearer ${outsiderToken}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`/api/v1/daily-clearances/today?farmId=${farm.id}`)
          .set('Authorization', `Bearer ${vetToken}`)
      ).status,
    ).toBe(404);
  });

  it('anchors only the canonical clearance hash, verifies it, and enforces anchor authorization', async () => {
    const current = await prisma.dailyFarmEligibilityEvaluation.findFirstOrThrow({
      where: { farmId: farm.id, status: 'CURRENT' },
      include: { clearance: true },
    });
    const onChain = new Map();
    const adapter = {
      async anchor(id, hash) {
        if (onChain.has(id)) throw Object.assign(new Error('duplicate'), { code: 'DUPLICATE' });
        onChain.set(id, `0x${hash}`);
        return {
          chainId: '31337',
          contractAddress: '0x0000000000000000000000000000000000000001',
          transactionHash: `0x${'1'.repeat(64)}`,
          blockNumber: 2,
        };
      },
      async read(id) {
        return { contentHash: onChain.get(id) || `0x${'0'.repeat(64)}` };
      },
    };
    const first = await anchorDailyClearance(current.clearance.id, owner.id, adapter);
    const second = await anchorDailyClearance(current.clearance.id, owner.id, adapter);
    expect(first.status).toBe('ANCHORED');
    expect(second.id).toBe(first.id);
    expect(first.contentHash).toBe(current.clearance.contentHashSha256);
    expect((await verifyDailyClearanceIntegrity(current.clearance, adapter)).status).toBe(
      'VERIFIED',
    );

    // A restarted local Hardhat chain has no prior proof even though MySQL may
    // still contain an ANCHORED row. Local-demo recovery must safely re-anchor
    // only the proof metadata, without changing the clearance snapshot.
    const restartedChain = new Map();
    const restartedAdapter = {
      async anchor(id, hash) {
        restartedChain.set(id, `0x${hash}`);
        return {
          chainId: '31337',
          contractAddress: '0x0000000000000000000000000000000000000002',
          transactionHash: `0x${'2'.repeat(64)}`,
          blockNumber: 1,
        };
      },
      async read(id) {
        return { contentHash: restartedChain.get(id) || `0x${'0'.repeat(64)}` };
      },
    };
    const recovered = await anchorDailyClearance(current.clearance.id, owner.id, restartedAdapter);
    expect(recovered.status).toBe('ANCHORED');
    expect(recovered.attemptCount).toBe(first.attemptCount + 1);
    expect(recovered.transactionHash).toBe(`0x${'2'.repeat(64)}`);
    expect((await verifyDailyClearanceIntegrity(current.clearance, restartedAdapter)).status).toBe(
      'VERIFIED',
    );
    const workerToken = signAccessToken(worker.id);
    const outsiderToken = signAccessToken(outsider.id);
    expect(
      (
        await request(app)
          .post(`/api/v1/daily-clearances/${current.id}/blockchain/anchor`)
          .set('Authorization', `Bearer ${workerToken}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/v1/daily-clearances/${current.id}/blockchain/anchor`)
          .set('Authorization', `Bearer ${outsiderToken}`)
      ).status,
    ).toBe(404);
  });

  it('supersedes the current version after a mid-day active treatment and preserves history', async () => {
    const treatmentRequest = await prisma.treatmentRequest.create({
      data: {
        farmId: farm.id,
        animalId: eligibleAnimal.id,
        requestedVeterinarianId: vet.id,
        createdById: owner.id,
        observations: 'Integration test observation',
        status: 'ACCEPTED',
      },
    });
    const veterinaryCase = await prisma.veterinaryCase.create({
      data: {
        requestId: treatmentRequest.id,
        farmId: farm.id,
        animalId: eligibleAnimal.id,
        veterinarianId: vet.id,
        status: 'TREATMENT_STARTED',
      },
    });
    await prisma.treatment.create({
      data: {
        caseId: veterinaryCase.id,
        farmId: farm.id,
        animalId: eligibleAnimal.id,
        veterinarianId: vet.id,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });
    await evaluateAndPersist(eligibleAnimal.id, 'TREATMENT_STATUS_CHANGED', vetUser.id);
    const versions = await prisma.dailyFarmEligibilityEvaluation.findMany({
      where: { farmId: farm.id },
      include: { items: true, clearance: true },
      orderBy: { version: 'asc' },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0].status).toBe('SUPERSEDED');
    expect(versions[0].items.find((item) => item.animalId === eligibleAnimal.id).included).toBe(
      true,
    );
    expect(versions[1].status).toBe('CURRENT');
    expect(versions[1].eligibleCount).toBe(1);
    expect(versions[1].items.find((item) => item.animalId === eligibleAnimal.id)).toMatchObject({
      included: false,
      eligibilityStatus: 'TREATMENT_ACTIVE',
    });
    expect(
      await prisma.alert.count({ where: { farmId: farm.id, type: 'DAILY_CLEARANCE_CHANGED' } }),
    ).toBe(2);
    const unchanged = await runDailyEvaluation(farm.id, {
      actorUserId: owner.id,
      trigger: 'TEST_REPEAT_BLOCKED',
    });
    expect(unchanged.id).toBe(versions[1].id);
    expect(await prisma.dailyFarmEligibilityEvaluation.count({ where: { farmId: farm.id } })).toBe(
      2,
    );
  });

  it('keeps public verification private and persists a zero-eligible evaluation without a clearance', async () => {
    const current = await prisma.dailyFarmEligibilityEvaluation.findFirstOrThrow({
      where: { farmId: farm.id, status: 'CURRENT' },
      include: { clearance: true },
    });
    const pdfResult = await request(app)
      .get(`/api/v1/daily-clearances/${current.id}/pdf`)
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`)
      .buffer(true);
    expect(pdfResult.status).toBe(200);
    expect(pdfResult.headers['content-type']).toContain('application/pdf');
    expect(Buffer.from(pdfResult.body).subarray(0, 4).toString()).toBe('%PDF');
    const publicResult = await request(app).get(
      `/api/v1/public/daily-clearances/${current.clearance.verificationId}`,
    );
    expect(publicResult.status).toBe(200);
    expect(publicResult.body.data).not.toHaveProperty('animals');
    expect(Object.keys(publicResult.body.data)).not.toEqual(
      expect.arrayContaining(['diagnosis', 'prescription', 'treatment']),
    );

    await prisma.animal.update({ where: { id: secondAnimal.id }, data: { lactating: false } });
    await prisma.treatment.updateMany({
      where: { farmId: farm.id, animalId: eligibleAnimal.id },
      data: { status: 'CANCELLED' },
    });
    await prisma.animal.update({ where: { id: eligibleAnimal.id }, data: { lactating: false } });
    const zero = await runDailyEvaluation(farm.id, { actorUserId: owner.id, trigger: 'TEST_ZERO' });
    expect(zero).toMatchObject({ status: 'CURRENT', applicableCount: 0, eligibleCount: 0 });
    expect(zero.clearance).toBeNull();
  });
});
