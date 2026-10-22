import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const app = createApp();

let vetUser;
let vetProfile;
let farmerUser;
let farm;

describe.sequential('Vet Analytics and Farm Daily Eligibility API', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('TestPassword123!');
    [vetUser, farmerUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `vet-analytics-${stamp}@test.local`,
          fullName: 'Dr. Test Vet',
          passwordHash,
          platformRoles: { create: [{ role: 'VETERINARIAN' }] },
        },
      }),
      prisma.user.create({
        data: {
          email: `farmer-analytics-${stamp}@test.local`,
          fullName: 'Farmer Test',
          passwordHash,
          platformRoles: { create: [{ role: 'FARMER' }] },
        },
      }),
    ]);

    vetProfile = await prisma.veterinarianProfile.create({
      data: {
        userId: vetUser.id,
        registrationNumber: `REG-${stamp}`,
        registrationCouncil: 'State Vet Council',
        qualification: 'BVSc & AH',
        status: 'VERIFIED',
      },
    });

    farm = await prisma.farm.create({
      data: {
        name: `Analytics Test Farm ${stamp}`,
        state: 'Maharashtra',
        district: 'Pune',
        status: 'ACTIVE',
        createdById: farmerUser.id,
        members: {
          create: [
            {
              userId: farmerUser.id,
              status: 'ACTIVE',
              joinedAt: new Date(),
              roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.farmMemberRole.deleteMany({ where: { farmMember: { farmId: farm.id } } });
    await prisma.farmMember.deleteMany({ where: { farmId: farm.id } });
    await prisma.dailyFarmEligibilityEvaluation.deleteMany({ where: { farmId: farm.id } });
    await prisma.dailyEligibilityJob.deleteMany({ where: { farmId: farm.id } });
    await prisma.farm.deleteMany({ where: { id: farm.id } });
    await prisma.veterinarianProfile.deleteMany({ where: { id: vetProfile.id } });
    await prisma.userPlatformRole.deleteMany({ where: { userId: { in: [vetUser.id, farmerUser.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [vetUser.id, farmerUser.id] } } });
  });

  it('GET /api/vet/analytics returns kpiStats, amuProfile, and topDiseases for authenticated vet', async () => {
    const token = signAccessToken(vetUser.id);
    const res = await request(app)
      .get('/api/vet/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.kpiStats).toBeDefined();
    expect(typeof res.body.data.kpiStats.totalCases).toBe('number');
    expect(typeof res.body.data.kpiStats.activeTreatments).toBe('number');
    expect(typeof res.body.data.kpiStats.antibioticsPrescribed).toBe('number');
    expect(Array.isArray(res.body.data.amuProfile)).toBe(true);
    expect(Array.isArray(res.body.data.topDiseases)).toBe(true);
  });

  it('GET /api/v1/vet/analytics is also accessible with identical payload structure', async () => {
    const token = signAccessToken(vetUser.id);
    const res = await request(app)
      .get('/api/v1/vet/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.kpiStats).toBeDefined();
  });

  it('GET /api/farms/:farmId/eligibility/today returns status and clearance info', async () => {
    const token = signAccessToken(farmerUser.id);
    const res = await request(app)
      .get(`/api/farms/${farm.id}/eligibility/today`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBeDefined();
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('clearanceNumber');
    expect(res.body.data.evaluationId).toBeDefined();
  });

  it('GET /api/v1/farms/:farmId/eligibility/today works with the versioned prefix', async () => {
    const token = signAccessToken(farmerUser.id);
    const res = await request(app)
      .get(`/api/v1/farms/${farm.id}/eligibility/today`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBeDefined();
  });
});
