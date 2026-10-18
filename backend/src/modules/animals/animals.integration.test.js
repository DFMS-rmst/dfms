import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const app = createApp();
const stamp = Date.now();
let farmAOwner;
let farmBOwner;
let farmA;
let farmB;
let animalA;
let animalB;
let species;

describe.sequential('Animal QR & Tag Verification API', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('TagTestPass!123');
    [farmAOwner, farmBOwner] = await Promise.all([
      prisma.user.create({
        data: {
          email: `farm-a-owner-${stamp}@test.local`,
          fullName: 'Farm A Owner',
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `farm-b-owner-${stamp}@test.local`,
          fullName: 'Farm B Owner',
          passwordHash,
        },
      }),
    ]);

    species = await prisma.species.findFirstOrThrow();

    farmA = await prisma.farm.create({
      data: {
        name: 'Alpha Dairy Farm',
        state: 'Punjab',
        district: 'Ludhiana',
        createdById: farmAOwner.id,
        members: {
          create: {
            userId: farmAOwner.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
          },
        },
      },
    });

    farmB = await prisma.farm.create({
      data: {
        name: 'Beta Dairy Farm',
        state: 'Haryana',
        district: 'Karnal',
        createdById: farmBOwner.id,
        members: {
          create: {
            userId: farmBOwner.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            roles: { create: [{ role: 'FARM_OWNER' }] },
          },
        },
      },
    });

    animalA = await prisma.animal.create({
      data: {
        farmId: farmA.id,
        speciesId: species.id,
        tagNumber: `PB-TAG-${stamp}`,
        name: 'Gauri',
        sex: 'FEMALE',
        lactating: true,
        verificationId: `anm_test_alpha_${stamp}`,
      },
      include: { species: true, farm: true },
    });

    animalB = await prisma.animal.create({
      data: {
        farmId: farmB.id,
        speciesId: species.id,
        tagNumber: `HR-TAG-${stamp}`,
        name: 'Shyama',
        sex: 'FEMALE',
        lactating: true,
        verificationId: `anm_test_beta_${stamp}`,
      },
      include: { species: true, farm: true },
    });
  });

  afterAll(async () => {
    await prisma.animalProfileEvent.deleteMany({
      where: { animalId: { in: [animalA?.id, animalB?.id].filter(Boolean) } },
    });
    await prisma.animal.deleteMany({
      where: { id: { in: [animalA?.id, animalB?.id].filter(Boolean) } },
    });
    await prisma.farmMemberRole.deleteMany({
      where: { farmMember: { farmId: { in: [farmA?.id, farmB?.id].filter(Boolean) } } },
    });
    await prisma.farmMember.deleteMany({
      where: { farmId: { in: [farmA?.id, farmB?.id].filter(Boolean) } },
    });
    await prisma.farm.deleteMany({
      where: { id: { in: [farmA?.id, farmB?.id].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [farmAOwner?.id, farmBOwner?.id].filter(Boolean) } },
    });
  });

  it('assigns a unique verificationId on animal registration', async () => {
    const token = signAccessToken(farmAOwner.id);
    const res = await request(app)
      .post(`/api/v1/farms/${farmA.id}/animals`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        speciesId: species.id,
        tagNumber: `PB-NEW-${stamp}`,
        name: 'Kalyani',
        sex: 'FEMALE',
        lactating: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.animal.verificationId).toBeDefined();
    expect(res.body.data.animal.verificationId).toMatch(/^anm_[A-Za-z0-9_-]+/);

    // Clean up created animal
    await prisma.animalProfileEvent.deleteMany({ where: { animalId: res.body.data.animal.id } });
    await prisma.animal.delete({ where: { id: res.body.data.animal.id } });
  });

  it('resolves animal by tag number within the authorized farm', async () => {
    const token = signAccessToken(farmAOwner.id);
    const res = await request(app)
      .post(`/api/v1/farms/${farmA.id}/animals/resolve-tag`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagInput: animalA.tagNumber });

    expect(res.status).toBe(200);
    expect(res.body.data.animal.id).toBe(animalA.id);
    expect(res.body.data.animal.tagNumber).toBe(animalA.tagNumber);
  });

  it('resolves animal by full verification URL within the authorized farm', async () => {
    const token = signAccessToken(farmAOwner.id);
    const fullUrl = `http://localhost:5173/verify/animal/${animalA.verificationId}`;
    const res = await request(app)
      .post(`/api/v1/farms/${farmA.id}/animals/resolve-tag`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagInput: fullUrl });

    expect(res.status).toBe(200);
    expect(res.body.data.animal.id).toBe(animalA.id);
    expect(res.body.data.animal.verificationId).toBe(animalA.verificationId);
  });

  it('prevents cross-farm animal resolution and returns 404', async () => {
    // Farm A owner attempts to resolve animal B (belongs to Farm B)
    const token = signAccessToken(farmAOwner.id);
    const res = await request(app)
      .post(`/api/v1/farms/${farmA.id}/animals/resolve-tag`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagInput: animalB.tagNumber });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ANIMAL_NOT_FOUND');
    expect(res.body.error.message).toContain('Cross-farm access is prevented');
  });

  it('retrieves QR tag metadata and data URL for authorized farm user', async () => {
    const token = signAccessToken(farmAOwner.id);
    const res = await request(app)
      .get(`/api/v1/farms/${farmA.id}/animals/${animalA.id}/qr-tag`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.verificationId).toBe(animalA.verificationId);
    expect(res.body.data.verificationUrl).toContain(`/verify/animal/${animalA.verificationId}`);
    expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('generates and downloads printable tag PDF', async () => {
    const token = signAccessToken(farmAOwner.id);
    const res = await request(app)
      .get(`/api/v1/farms/${farmA.id}/animals/${animalA.id}/tag-pdf`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`Animal-Tag-${animalA.tagNumber}.pdf`);
    expect(res.body.slice(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('serves public animal verification without authentication and shows deterministic status', async () => {
    const res = await request(app).get(`/api/v1/public/animals/${animalA.verificationId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.animalTag).toBe(animalA.tagNumber);
    expect(res.body.data.species).toBe(species.canonicalName);
    expect(res.body.data.farmName).toBe(farmA.name);
    expect(res.body.data.status).toBe('ELIGIBLE_FOR_MILK');
    expect(res.body.data.disclaimer).toBeDefined();

    // Verify privacy: sensitive information is not exposed
    expect(res.body.data.ownerPhone).toBeUndefined();
    expect(res.body.data.ownerEmail).toBeUndefined();
    expect(res.body.data.clinicalNotes).toBeUndefined();
  });

  it('returns 404 for unknown public verification ID', async () => {
    const res = await request(app).get('/api/v1/public/animals/anm_nonexistent_id');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ANIMAL_NOT_FOUND');
  });
});
