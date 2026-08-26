import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../infrastructure/prisma/client.js';

const stamp = Date.now();
const ownerEmail = `owner-${stamp}@example.test`;
const outsiderEmail = `outsider-${stamp}@example.test`;
const vetEmail = `vet-${stamp}@example.test`;
const adminEmail = `admin-${stamp}@example.test`;
const password = 'StrongTest!234';
let farmId;
let animalId;
let vetProfileId;
const app = createApp();
async function register(email, fullName) {
  return request(app).post('/api/v1/auth/register').send({ email, fullName, password });
}

describe.sequential('platform foundation integration', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Platform Admin',
        passwordHash,
        platformRoles: { create: { role: 'PLATFORM_ADMIN' } },
      },
    });
  });
  afterAll(async () => {
    if (farmId) await prisma.animal.deleteMany({ where: { farmId } });
    if (farmId) await prisma.farm.delete({ where: { id: farmId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, outsiderEmail, vetEmail, adminEmail] } },
    });
    await prisma.$disconnect();
  });
  it('registers, logs in, rejects a bad password, rotates refresh, and logs out', async () => {
    expect((await register(ownerEmail, 'Farm Owner')).status).toBe(201);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: ownerEmail, password: 'WrongPassword!234' })
      ).status,
    ).toBe(401);
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send({ email: ownerEmail, password });
    expect(login.status).toBe(200);
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(200);
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(401);
  });
  it('enforces farm scope and supports owner plus manager roles', async () => {
    const owner = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password });
    const token = owner.body.data.accessToken;
    const created = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Integration Dairy Farm',
        state: 'Karnataka',
        district: 'Mysuru',
        pincode: '570001',
      });
    expect(created.status).toBe(201);
    farmId = created.body.data.farm.id;
    const membership = await prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: owner.body.data.user.id } },
      include: { roles: true },
    });
    expect(membership.roles.map((r) => r.role).sort()).toEqual(['FARM_MANAGER', 'FARM_OWNER']);
    const outsider = await register(outsiderEmail, 'Unrelated User');
    const outsiderToken = outsider.body.data.accessToken;
    expect(
      (
        await request(app)
          .get(`/api/v1/farms/${farmId}`)
          .set('Authorization', `Bearer ${outsiderToken}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/v1/farms/${farmId}`)
          .set('Authorization', `Bearer ${outsiderToken}`)
          .send({ name: 'Nope' })
      ).status,
    ).toBe(404);
    const species = await prisma.species.findUnique({ where: { code: 'BOS_TAURUS' } });
    const animal = await request(app)
      .post(`/api/v1/farms/${farmId}/animals`)
      .set('Authorization', `Bearer ${token}`)
      .send({ speciesId: species.id, tagNumber: 'TEST-001', sex: 'FEMALE', lactating: true });
    expect(animal.status).toBe(201);
    animalId = animal.body.data.animal.id;
    expect(
      (
        await request(app)
          .get(`/api/v1/farms/${farmId}/animals/${animalId}`)
          .set('Authorization', `Bearer ${outsiderToken}`)
      ).status,
    ).toBe(404);
  });
  it('starts veterinarian applications pending and only an admin can verify', async () => {
    const vet = await register(vetEmail, 'Test Veterinarian');
    const vetToken = vet.body.data.accessToken;
    const submitted = await request(app)
      .put('/api/v1/veterinarians/me')
      .set('Authorization', `Bearer ${vetToken}`)
      .send({
        registrationNumber: `REG-${stamp}`,
        registrationCouncil: 'Test State Veterinary Council',
        qualification: 'B.V.Sc. & A.H.',
        specialization: 'Bovine medicine',
        experienceYears: 4,
        serviceAreas: [{ state: 'Karnataka', district: 'Mysuru' }],
      });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.profile.status).toBe('PENDING');
    vetProfileId = submitted.body.data.profile.id;
    expect(
      (
        await request(app)
          .patch(`/api/v1/admin/veterinarians/${vetProfileId}/verification`)
          .set('Authorization', `Bearer ${vetToken}`)
          .send({ status: 'VERIFIED' })
      ).status,
    ).toBe(403);
    const admin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password });
    const verified = await request(app)
      .patch(`/api/v1/admin/veterinarians/${vetProfileId}/verification`)
      .set('Authorization', `Bearer ${admin.body.data.accessToken}`)
      .send({ status: 'VERIFIED', reviewNotes: 'Credentials reviewed for test' });
    expect(verified.status).toBe(200);
    expect(verified.body.data.profile.status).toBe('VERIFIED');
    expect(verified.body.data.profile.reviewedAt).toBeTruthy();
  });
  it('protects S3 intents and validates file constraints without live AWS', async () => {
    expect((await request(app).post('/api/v1/files/upload-intents').send({})).status).toBe(401);
    const vet = await request(app).post('/api/v1/auth/login').send({ email: vetEmail, password });
    const auth = { Authorization: `Bearer ${vet.body.data.accessToken}` };
    const base = {
      entityType: 'VETERINARIAN_PROFILE',
      entityId: vetProfileId,
      purpose: 'REGISTRATION_CERTIFICATE',
      sizeBytes: 1000,
    };
    expect(
      (
        await request(app)
          .post('/api/v1/files/upload-intents')
          .set(auth)
          .send({ ...base, mimeType: 'text/html' })
      ).body.error.code,
    ).toBe('INVALID_FILE_TYPE');
    expect(
      (
        await request(app)
          .post('/api/v1/files/upload-intents')
          .set(auth)
          .send({ ...base, mimeType: 'application/pdf', sizeBytes: 99_000_000 })
      ).body.error.code,
    ).toBe('FILE_TOO_LARGE');
  });
});
