import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const app = createApp();
const stamp = Date.now();
let owner;
let outsider;
let admin;
let farm;
let animal;
let certificate;
describe.sequential('certificate trust API', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('CertificateTest!234');
    [owner, outsider, admin] = await Promise.all([
      prisma.user.create({
        data: {
          email: `cert-owner-${stamp}@test.local`,
          fullName: 'Certificate Owner',
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `cert-outsider-${stamp}@test.local`,
          fullName: 'Certificate Outsider',
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `cert-admin-${stamp}@test.local`,
          fullName: 'Certificate Admin',
          passwordHash,
          platformRoles: { create: { role: 'PLATFORM_ADMIN' } },
        },
      }),
    ]);
    const species = await prisma.species.findFirstOrThrow();
    farm = await prisma.farm.create({
      data: {
        name: 'Certificate Test Farm',
        state: 'Karnataka',
        district: 'Mysuru',
        createdById: owner.id,
        members: {
          create: {
            userId: owner.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
          },
        },
      },
    });
    animal = await prisma.animal.create({
      data: {
        farmId: farm.id,
        speciesId: species.id,
        tagNumber: `CERT-${stamp}`,
        sex: 'FEMALE',
        lactating: true,
      },
    });
  });
  afterAll(async () => {
    await prisma.blockchainAnchor.deleteMany({ where: { recordId: certificate?.id } });
    await prisma.milkEligibilityCertificate.deleteMany({ where: { animalId: animal?.id } });
    await prisma.milkEligibilityCheck.deleteMany({ where: { animalId: animal?.id } });
    await prisma.animalProfileEvent.deleteMany({ where: { animalId: animal?.id } });
    await prisma.alert.deleteMany({
      where: { userId: { in: [owner?.id, outsider?.id, admin?.id] } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: [owner?.id, outsider?.id, admin?.id] } },
    });
    if (animal) await prisma.animal.delete({ where: { id: animal.id } });
    if (farm) await prisma.farm.delete({ where: { id: farm.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [owner?.id, outsider?.id, admin?.id].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });
  it('issues only from the current eligible evaluation and snapshots its evidence', async () => {
    const response = await request(app)
      .post(`/api/v1/certificates/animals/${animal.id}`)
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`);
    expect(response.status).toBe(201);
    certificate = response.body.data.certificate;
    expect(certificate.status).toBe('ACTIVE');
    expect(certificate.canonicalPayload.eligibility.evaluationId).toBeTruthy();
    expect(certificate.disclaimer).toContain('does not represent laboratory residue testing');
  });
  it('is idempotent for the same eligibility evidence', async () => {
    const response = await request(app)
      .post(`/api/v1/certificates/animals/${animal.id}`)
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`);
    expect(response.status).toBe(200);
    expect(response.body.data.certificate.id).toBe(certificate.id);
  });
  it('blocks an unrelated farm user', async () => {
    expect(
      (
        await request(app)
          .post(`/api/v1/certificates/animals/${animal.id}`)
          .set('Authorization', `Bearer ${signAccessToken(outsider.id)}`)
      ).status,
    ).toBe(404);
  });
  it('generates PDF/QR and exposes a privacy-limited public projection', async () => {
    const detail = await request(app)
      .get(`/api/v1/certificates/${certificate.id}`)
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`);
    expect(detail.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(
      (
        await request(app)
          .get(`/api/v1/certificates/${certificate.id}/pdf`)
          .set('Authorization', `Bearer ${signAccessToken(owner.id)}`)
      ).headers['content-type'],
    ).toContain('application/pdf');
    const publicResult = await request(app).get(
      `/api/v1/public/certificates/${certificate.verificationId}`,
    );
    expect(publicResult.status).toBe(200);
    expect(publicResult.body.data.blockchainIntegrity).toBe('NOT_ANCHORED');
    expect(publicResult.body.data).not.toHaveProperty('canonicalPayload');
    expect(JSON.stringify(publicResult.body.data)).not.toContain('passwordHash');
  });
  it('detects snapshot tampering and keeps failed proof retries recoverable and idempotent', async () => {
    const original = certificate.canonicalPayload;
    await prisma.milkEligibilityCertificate.update({
      where: { id: certificate.id },
      data: { canonicalPayload: { ...original, farm: { name: 'Tampered farm' } } },
    });
    const tampered = await request(app)
      .get(`/api/v1/certificates/${certificate.id}/blockchain/verify`)
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`);
    expect(tampered.body.data.verification.status).toBe('TAMPERED');
    await prisma.milkEligibilityCertificate.update({
      where: { id: certificate.id },
      data: { canonicalPayload: original },
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app)
        .post(`/api/v1/certificates/${certificate.id}/blockchain/anchor`)
        .set('Authorization', `Bearer ${signAccessToken(owner.id)}`);
      expect(response.body.data.anchor.status).toBe('FAILED');
    }
    const anchors = await prisma.blockchainAnchor.findMany({ where: { recordId: certificate.id } });
    expect(anchors).toHaveLength(1);
    expect(anchors[0].attemptCount).toBe(2);
  });
  it('keeps a revoked certificate as historical evidence with intact proof semantics', async () => {
    const response = await request(app)
      .post(`/api/v1/certificates/${certificate.id}/revoke`)
      .set('Authorization', `Bearer ${signAccessToken(admin.id)}`)
      .send({ code: 'ADMINISTRATIVE_CORRECTION', reason: 'Test correction with retained history' });
    expect(response.status).toBe(200);
    expect(response.body.data.certificate.status).toBe('REVOKED');
    expect(await prisma.milkEligibilityCertificate.count({ where: { id: certificate.id } })).toBe(
      1,
    );
  });
  it('scopes real dashboard aggregates and report exports', async () => {
    const ownerToken = signAccessToken(owner.id);
    const dashboard = await request(app)
      .get(`/api/v1/dashboards/farm?farmId=${farm.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.animals).toBe(1);
    expect(dashboard.body.data.certificates.REVOKED).toBe(1);
    const report = await request(app)
      .get(`/api/v1/reports/certificates?farmId=${farm.id}&format=csv`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(report.status).toBe(200);
    expect(report.headers['content-type']).toContain('text/csv');
    expect(report.text).toContain(certificate.certificateNumber);
    expect(
      (
        await request(app)
          .get(`/api/v1/dashboards/farm?farmId=${farm.id}`)
          .set('Authorization', `Bearer ${signAccessToken(outsider.id)}`)
      ).status,
    ).toBe(404);
  });
});
