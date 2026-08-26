import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess, requirePlatformRole } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { anchorCertificate, verifyCertificateIntegrity } from '../blockchain/service.js';
import { appendAudit } from '../audit/index.js';
import { issueCertificate, revokeCertificate } from './service.js';
import { qrDataUrl, renderCertificatePdf, verificationUrl } from './pdf.js';

async function authorize(req, certificate, manage = false) {
  if (req.principal.platformRoles.includes('PLATFORM_ADMIN')) return;
  try {
    await requireFarmAccess(
      req.principal.user.id,
      certificate.farmId,
      manage ? ['FARM_OWNER', 'FARM_MANAGER'] : undefined,
    );
  } catch (error) {
    if (manage) throw error;
    const assigned = await prisma.veterinaryCase.count({
      where: { animalId: certificate.animalId, veterinarian: { userId: req.principal.user.id } },
    });
    if (!assigned) throw error;
  }
}
const included = {
  animal: { include: { farm: true, species: true } },
  eligibilityCheck: { include: { treatmentEvaluations: true } },
};
export const certificatesRouter = Router();
certificatesRouter.use(authenticate);
certificatesRouter.post(
  '/animals/:animalId',
  asyncHandler(async (req, res) => {
    const animal = await prisma.animal.findUnique({
      where: { id: req.params.animalId },
      select: { farmId: true },
    });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
    if (!req.principal.platformRoles.includes('PLATFORM_ADMIN'))
      await requireFarmAccess(req.principal.user.id, animal.farmId, ['FARM_OWNER', 'FARM_MANAGER']);
    const result = await issueCertificate(req.params.animalId, req.principal.user.id);
    res.status(result.created ? 201 : 200).json({ data: result });
  }),
);
certificatesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const admin = req.principal.platformRoles.includes('PLATFORM_ADMIN');
    let farmIds;
    if (req.query.farmId) {
      if (!admin) await requireFarmAccess(req.principal.user.id, String(req.query.farmId));
      farmIds = [String(req.query.farmId)];
    } else if (!admin) {
      const memberships = (
        await prisma.farmMember.findMany({
          where: { userId: req.principal.user.id, status: 'ACTIVE' },
          select: { farmId: true },
        })
      ).map((x) => x.farmId);
      const cases = (
        await prisma.veterinaryCase.findMany({
          where: { veterinarian: { userId: req.principal.user.id } },
          select: { farmId: true },
        })
      ).map((x) => x.farmId);
      farmIds = [...new Set([...memberships, ...cases])];
    }
    const certificates = await prisma.milkEligibilityCertificate.findMany({
      where: {
        ...(farmIds ? { farmId: { in: farmIds } } : {}),
        ...(req.query.status ? { status: String(req.query.status) } : {}),
      },
      include: included,
      orderBy: { issuedAt: 'desc' },
    });
    res.json({ data: { certificates } });
  }),
);
certificatesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const certificate = await prisma.milkEligibilityCertificate.findUnique({
      where: { id: req.params.id },
      include: included,
    });
    if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
    await authorize(req, certificate);
    const integrity = await verifyCertificateIntegrity(certificate);
    res.json({
      data: {
        certificate,
        verificationUrl: verificationUrl(certificate.verificationId),
        qrDataUrl: await qrDataUrl(certificate.verificationId),
        blockchainIntegrity: integrity.status,
      },
    });
  }),
);
certificatesRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const certificate = await prisma.milkEligibilityCertificate.findUnique({
      where: { id: req.params.id },
    });
    if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
    await authorize(req, certificate);
    const pdf = await renderCertificatePdf(certificate);
    await appendAudit({
      actorUserId: req.principal.user.id,
      action: 'CERTIFICATE_PDF_GENERATED',
      entityType: 'MilkEligibilityCertificate',
      entityId: certificate.id,
      farmId: certificate.farmId,
    });
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${certificate.certificateNumber}.pdf"`,
      })
      .send(pdf);
  }),
);
certificatesRouter.post(
  '/:id/revoke',
  requirePlatformRole('PLATFORM_ADMIN'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        code: z.enum([
          'ADMINISTRATIVE_CORRECTION',
          'REFERENCE_RULE_CHANGE',
          'ELIGIBILITY_REEVALUATION',
        ]),
        reason: z.string().min(3).max(500),
      })
      .parse(req.body);
    res.json({
      data: {
        certificate: await revokeCertificate(
          req.params.id,
          req.principal.user.id,
          body.code,
          body.reason,
        ),
      },
    });
  }),
);
certificatesRouter.post(
  '/:id/blockchain/anchor',
  asyncHandler(async (req, res) => {
    const certificate = await prisma.milkEligibilityCertificate.findUnique({
      where: { id: req.params.id },
    });
    if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
    await authorize(req, certificate, true);
    res.json({ data: { anchor: await anchorCertificate(certificate.id, req.principal.user.id) } });
  }),
);
certificatesRouter.get(
  '/:id/blockchain/verify',
  asyncHandler(async (req, res) => {
    const certificate = await prisma.milkEligibilityCertificate.findUnique({
      where: { id: req.params.id },
    });
    if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
    await authorize(req, certificate);
    res.json({
      data: {
        verification: await verifyCertificateIntegrity(certificate),
        certificateStatus: certificate.status,
      },
    });
  }),
);

export const publicCertificatesRouter = Router();
publicCertificatesRouter.get(
  '/:verificationId',
  asyncHandler(async (req, res) => {
    const certificate = await prisma.milkEligibilityCertificate.findUnique({
      where: { verificationId: req.params.verificationId },
      include: { animal: { include: { farm: true, species: true } } },
    });
    if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
    const integrity = await verifyCertificateIntegrity(certificate);
    res.json({
      data: {
        certificateNumber: certificate.certificateNumber,
        animalTag: certificate.animal.tagNumber,
        farmName: certificate.animal.farm.name,
        species: certificate.animal.species.canonicalName,
        issuedAt: certificate.issuedAt,
        eligibleFrom: certificate.eligibleFrom,
        certificateStatus: certificate.status,
        referenceSources: certificate.canonicalPayload.eligibility.treatments
          .map((x) => x.rule?.source?.organization)
          .filter(Boolean),
        blockchainIntegrity: integrity.status,
        disclaimer: certificate.disclaimer,
      },
    });
  }),
);
