import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { answerAdvisor } from './service.js';

const askSchema = z.object({
  conversationId: z.string().optional(),
  question: z.string().min(2).max(1000),
  farmId: z.string().optional(),
  animalId: z.string().optional(),
});
async function authorizeScope(request, farmId) {
  if (request.principal.platformRoles.includes('PLATFORM_ADMIN')) return;
  const vetCase = await prisma.veterinaryCase.findFirst({
    where: { farmId, veterinarian: { userId: request.principal.user.id } },
  });
  if (!vetCase) await requireFarmAccess(request.principal.user.id, farmId);
}

export const advisorRouter = Router();
advisorRouter.use(authenticate);
advisorRouter.post(
  '/ask',
  asyncHandler(async (request, response) => {
    const input = askSchema.parse(request.body);
    let farmId = input.farmId;
    if (input.animalId) {
      const animal = await prisma.animal.findUnique({
        where: { id: input.animalId },
        select: { farmId: true },
      });
      if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
      if (farmId && farmId !== animal.farmId)
        throw new AppError(400, 'SCOPE_MISMATCH', 'Animal does not belong to farm');
      farmId = animal.farmId;
    }
    if (farmId) await authorizeScope(request, farmId);
    response.json({
      data: await answerAdvisor({ ...input, farmId, userId: request.principal.user.id }),
    });
  }),
);
advisorRouter.get(
  '/conversations',
  asyncHandler(async (request, response) => {
    const conversations = await prisma.advisorConversation.findMany({
      where: { userId: request.principal.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    response.json({ data: { conversations } });
  }),
);
