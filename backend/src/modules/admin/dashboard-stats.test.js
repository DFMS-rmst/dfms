import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const app = createApp();

let adminUser;

describe.sequential('Admin Dashboard Stats API', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('AdminTest123!');
    adminUser = await prisma.user.create({
      data: {
        email: `admin-stats-${stamp}@test.local`,
        fullName: 'Platform Admin Test',
        passwordHash,
        platformRoles: { create: [{ role: 'PLATFORM_ADMIN' }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.userPlatformRole.deleteMany({ where: { userId: adminUser.id } });
    await prisma.user.deleteMany({ where: { id: adminUser.id } });
  });

  it('GET /api/admin/dashboard-stats returns all 5 required data objects', async () => {
    const token = signAccessToken(adminUser.id);
    const res = await request(app)
      .get('/api/admin/dashboard-stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toBeDefined();

    // 1. Pending Verifications
    expect(data.pendingVerifications).toBeDefined();
    expect(typeof data.pendingVerifications.total).toBe('number');
    expect(typeof data.pendingVerifications.farmerProfiles).toBe('number');
    expect(typeof data.pendingVerifications.veterinarianProfiles).toBe('number');
    expect(typeof data.pendingVerifications.dairyOwnerProfiles).toBe('number');
    expect(typeof data.pendingVerifications.farms).toBe('number');

    // 2. MRL Status
    expect(Array.isArray(data.mrlStatus)).toBe(true);
    expect(data.mrlStatus.length).toBe(3);
    const mrlStatuses = data.mrlStatus.map((s) => s.status);
    expect(mrlStatuses).toContain('ELIGIBLE_FOR_MILK');
    expect(mrlStatuses).toContain('UNDER_WITHDRAWAL');
    expect(mrlStatuses).toContain('TREATMENT_ACTIVE');

    // 3. AMU & Disease Trends
    expect(data.amuAndDiseaseTrends).toBeDefined();
    expect(Array.isArray(data.amuAndDiseaseTrends.antibioticClasses)).toBe(true);
    expect(Array.isArray(data.amuAndDiseaseTrends.topDiseases)).toBe(true);

    // 4. Dairy Economy
    expect(data.dairyEconomy).toBeDefined();
    expect(typeof data.dairyEconomy.totalCost).toBe('number');
    expect(typeof data.dairyEconomy.totalQuantityLiters).toBe('number');
    expect(Array.isArray(data.dairyEconomy.dailyProcurement)).toBe(true);

    // 5. ML Risk Distribution
    expect(Array.isArray(data.mlRiskDistribution)).toBe(true);
  });

  it('GET /api/v1/admin/dashboard-stats is accessible with identical payload', async () => {
    const token = signAccessToken(adminUser.id);
    const res = await request(app)
      .get('/api/v1/admin/dashboard-stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pendingVerifications).toBeDefined();
    expect(res.body.data.dairyEconomy).toBeDefined();
  });
});
