import { Router } from 'express';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { anchorDailyClearance, verifyDailyClearanceIntegrity } from '../blockchain/service.js';
import { hashDailySnapshot } from './canonical.js';
import {
  getDailyEvaluation,
  getToday,
  listDailyEvaluations,
  runDailyEvaluation,
} from './service.js';
import { renderDailyClearancePdf } from './pdf.js';

async function farmAccess(req, farmId, manage = false) {
  return requireFarmAccess(
    req.principal.user.id,
    farmId,
    manage ? ['FARM_OWNER', 'FARM_MANAGER'] : undefined,
  );
}

export const dailyClearanceRouter = Router();
dailyClearanceRouter.use(authenticate);
dailyClearanceRouter.get(
  '/today',
  asyncHandler(async (req, res) => {
    if (!req.query.farmId) throw new AppError(400, 'FARM_REQUIRED', 'farmId is required');
    await farmAccess(req, String(req.query.farmId));
    const evaluation = await getToday(String(req.query.farmId), {
      actorUserId: req.principal.user.id,
      trigger: 'FIRST_ACCESS',
    });
    res.json({ data: { evaluation } });
  }),
);
dailyClearanceRouter.post(
  '/run-today',
  asyncHandler(async (req, res) => {
    if (!req.body.farmId) throw new AppError(400, 'FARM_REQUIRED', 'farmId is required');
    await farmAccess(req, req.body.farmId, true);
    const evaluation = await runDailyEvaluation(req.body.farmId, {
      actorUserId: req.principal.user.id,
      trigger: 'MANUAL_SAFE_TRIGGER',
    });
    res.json({ data: { evaluation } });
  }),
);
dailyClearanceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.query.farmId) throw new AppError(400, 'FARM_REQUIRED', 'farmId is required');
    await farmAccess(req, String(req.query.farmId));
    res.json({ data: { evaluations: await listDailyEvaluations(String(req.query.farmId)) } });
  }),
);
dailyClearanceRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const evaluation = await getDailyEvaluation(req.params.id);
    if (!evaluation)
      throw new AppError(404, 'DAILY_EVALUATION_NOT_FOUND', 'Daily evaluation not found');
    await farmAccess(req, evaluation.farmId);
    if (!evaluation.clearance)
      throw new AppError(409, 'NO_ELIGIBLE_ANIMALS', 'No animals qualify for a positive clearance');
    const pdf = await renderDailyClearancePdf(evaluation.clearance);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${evaluation.clearance.clearanceNumber}.pdf"`,
      })
      .send(pdf);
  }),
);
dailyClearanceRouter.post(
  '/:id/blockchain/anchor',
  asyncHandler(async (req, res) => {
    const evaluation = await getDailyEvaluation(req.params.id);
    if (!evaluation)
      throw new AppError(404, 'DAILY_EVALUATION_NOT_FOUND', 'Daily evaluation not found');
    await farmAccess(req, evaluation.farmId, true);
    if (!evaluation.clearance)
      throw new AppError(409, 'NO_CLEARANCE', 'This evaluation has no positive clearance');
    if (evaluation.status !== 'CURRENT')
      throw new AppError(
        409,
        'CLEARANCE_NOT_CURRENT',
        'Only the current clearance can be anchored',
      );
    res.json({
      data: {
        anchor: await anchorDailyClearance(evaluation.clearance.id, req.principal.user.id),
      },
    });
  }),
);
dailyClearanceRouter.get(
  '/:id/blockchain/verify',
  asyncHandler(async (req, res) => {
    const evaluation = await getDailyEvaluation(req.params.id);
    if (!evaluation)
      throw new AppError(404, 'DAILY_EVALUATION_NOT_FOUND', 'Daily evaluation not found');
    await farmAccess(req, evaluation.farmId);
    if (!evaluation.clearance)
      throw new AppError(409, 'NO_CLEARANCE', 'This evaluation has no positive clearance');
    res.json({
      data: {
        verification: await verifyDailyClearanceIntegrity(evaluation.clearance),
        clearanceStatus: evaluation.status,
      },
    });
  }),
);

export const publicDailyClearanceRouter = Router();
publicDailyClearanceRouter.get(
  '/:verificationId',
  asyncHandler(async (req, res) => {
    const clearance = await prisma.dailyMilkCollectionClearance.findUnique({
      where: { verificationId: req.params.verificationId },
      include: { evaluation: { include: { farm: true } } },
    });
    if (!clearance) throw new AppError(404, 'CLEARANCE_NOT_FOUND', 'Daily clearance not found');
    const documentIntegrity =
      hashDailySnapshot(clearance.canonicalPayload) === clearance.contentHashSha256
        ? 'VERIFIED'
        : 'TAMPERED';
    const blockchain = await verifyDailyClearanceIntegrity(clearance);
    res.json({
      data: {
        clearanceNumber: clearance.clearanceNumber,
        farmName: clearance.evaluation.farm.name,
        businessDate: clearance.canonicalPayload.businessDate,
        generatedAt: clearance.generatedAt,
        version: clearance.evaluation.version,
        status: clearance.evaluation.status,
        eligibleAnimalCount: clearance.evaluation.eligibleCount,
        documentIntegrity,
        blockchainIntegrity: blockchain.status,
        disclaimer: clearance.disclaimer,
      },
    });
  }),
);
