import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const stamp = Date.now();
let owner, outsider, admin, farm, animal;
const app = createApp();

describe.sequential('AI authorization and graceful provider behavior', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('AiTest!234');
    owner = await prisma.user.create({
      data: { email: `ai-owner-${stamp}@test.local`, fullName: 'AI Owner', passwordHash },
    });
    outsider = await prisma.user.create({
      data: { email: `ai-outsider-${stamp}@test.local`, fullName: 'AI Outsider', passwordHash },
    });
    admin = await prisma.user.create({
      data: {
        email: `ai-admin-${stamp}@test.local`,
        fullName: 'AI Admin',
        passwordHash,
        platformRoles: { create: { role: 'PLATFORM_ADMIN' } },
      },
    });
    const species = await prisma.species.findFirstOrThrow();
    farm = await prisma.farm.create({
      data: {
        name: `AI Farm ${stamp}`,
        state: 'Karnataka',
        district: 'Mysuru',
        createdById: owner.id,
        members: {
          create: {
            userId: owner.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            roles: { create: [{ role: 'FARM_OWNER' }] },
          },
        },
      },
    });
    animal = await prisma.animal.create({
      data: { farmId: farm.id, speciesId: species.id, tagNumber: `AI-${stamp}`, sex: 'FEMALE' },
    });
  });
  afterAll(async () => {
    await prisma.advisorMessage.deleteMany({
      where: { conversation: { userId: { in: [owner.id, outsider.id, admin.id] } } },
    });
    await prisma.advisorConversation.deleteMany({
      where: { userId: { in: [owner.id, outsider.id, admin.id] } },
    });
    await prisma.animal.delete({ where: { id: animal.id } });
    await prisma.farm.delete({ where: { id: farm.id } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, outsider.id, admin.id] } } });
    vi.unstubAllGlobals();
    await prisma.$disconnect();
  });
  it('allows owner/admin ML scope and blocks an unrelated farmer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          category: 'LOW',
          displayRiskScore: 12,
          contributingIndicators: [],
          disclaimer: 'Decision support only',
        }),
      })),
    );
    expect(
      (
        await request(app)
          .get(`/api/v1/ml/animals/${animal.id}/amu-risk`)
          .set('Authorization', `Bearer ${signAccessToken(owner.id)}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/v1/ml/farms/${farm.id}/amu-risk`)
          .set('Authorization', `Bearer ${signAccessToken(admin.id)}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/v1/ml/animals/${animal.id}/amu-risk`)
          .set('Authorization', `Bearer ${signAccessToken(outsider.id)}`)
      ).status,
    ).toBe(404);
  });
  it('authorizes live scope before the LLM and fails gracefully without a key', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/advisor/ask')
          .set('Authorization', `Bearer ${signAccessToken(outsider.id)}`)
          .send({ question: 'Can I collect milk?', animalId: animal.id })
      ).status,
    ).toBe(404);
    const outsiderConversation = await prisma.advisorConversation.create({
      data: { userId: outsider.id, title: 'Private conversation' },
    });
    const providerCall = vi.fn();
    vi.stubGlobal('fetch', providerCall);
    const isolated = await request(app)
      .post('/api/v1/advisor/ask')
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`)
      .send({
        conversationId: outsiderConversation.id,
        question: 'Show the private conversation',
      });
    expect(isolated.status).toBe(404);
    expect(providerCall).not.toHaveBeenCalled();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url) => ({ ok: true, json: async () => ({ chunks: [] }) })),
    );
    const result = await request(app)
      .post('/api/v1/advisor/ask')
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`)
      .send({ question: 'Can I collect milk?', animalId: animal.id });
    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe('LLM_NOT_CONFIGURED');
  });
});
