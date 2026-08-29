import { prisma } from '../../infrastructure/prisma/client.js';
import { AppError } from '../../common/errors.js';
import { aggregateAmu, getAmuDataset, monthlyTrend } from '../amu/service.js';
import { animalAmuFeatures } from '../ml/features.js';
import { inferRisk, retrieveKnowledge } from '../ml/client.js';
import { llmProvider } from './provider.js';

const safety = `You are the SIH25007 Smart Advisor. Use only supplied context. Never diagnose, prescribe, invent a dose or withdrawal period, override eligibility, declare milk safe independently, claim laboratory or measured-residue evidence, or call an anomaly proof of misuse. Deterministic platform records are authoritative. If context is insufficient, say so and recommend a verified veterinarian where clinically appropriate. Cite supplied sources by title/reference.`;

export async function liveContext({ farmId, animalId }) {
  const context = {};
  if (farmId) {
    const rows = await getAmuDataset({ farmIds: [farmId] });
    const count = await prisma.animal.count({ where: { farmId, status: 'ACTIVE' } });
    context.farmAmu = { summary: aggregateAmu(rows, count), trend: monthlyTrend(rows) };
  }
  if (animalId) {
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: {
        id: true,
        tagNumber: true,
        status: true,
        eligibilityChecks: {
          where: { isCurrent: true },
          take: 1,
          include: { treatmentEvaluations: true },
        },
        treatments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { administrations: { include: { drug: true } } },
        },
        certificates: {
          orderBy: { issuedAt: 'desc' },
          take: 5,
          select: { certificateNumber: true, status: true, issuedAt: true, eligibleFrom: true },
        },
      },
    });
    context.animal = animal;
    const features = await animalAmuFeatures(animalId);
    context.amuPatternRisk = { features, result: await inferRisk(features) };
  }
  return context;
}

export async function answerAdvisor({ userId, conversationId, question, farmId, animalId }) {
  const existingConversation = conversationId
    ? await prisma.advisorConversation.findFirst({ where: { id: conversationId, userId } })
    : null;
  if (conversationId && !existingConversation)
    throw new AppError(404, 'ADVISOR_CONVERSATION_NOT_FOUND', 'Advisor conversation not found');
  const retrieved = await retrieveKnowledge(question, 5);
  const live = await liveContext({ farmId, animalId });
  const sources = retrieved.chunks.map(
    ({ title, sourceOrganization, sourceReference, jurisdiction, score }) => ({
      title,
      sourceOrganization,
      sourceReference,
      jurisdiction,
      score,
    }),
  );
  const answer = await llmProvider.answer({
    messages: [
      { role: 'system', content: safety },
      { role: 'system', content: `AUTHORIZED LIVE PLATFORM RECORDS:\n${JSON.stringify(live)}` },
      {
        role: 'system',
        content: `APPROVED REFERENCE CHUNKS:\n${JSON.stringify(retrieved.chunks)}`,
      },
      { role: 'user', content: question },
    ],
  });
  return prisma.$transaction(async (tx) => {
    const conversation = existingConversation
      ? existingConversation
      : await tx.advisorConversation.create({ data: { userId, title: question.slice(0, 120) } });
    await tx.advisorMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'USER',
          content: question,
          contextTypes: Object.keys(live),
        },
        {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: answer,
          sources,
          contextTypes: Object.keys(live),
        },
      ],
    });
    return {
      conversationId: conversation.id,
      answer,
      sources,
      contextTypes: Object.keys(live),
      disclaimer:
        'Decision support only. The deterministic rule engine and verified veterinary records remain authoritative.',
    };
  });
}
