import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { createAlerts } from '../alerts/service.js';
import { appendAudit } from '../audit/index.js';
import { evaluateAndPersist } from '../withdrawal/service.js';
import {
  assertAssignedVerifiedVet,
  assertTransition,
  caseTransitions,
  loadCaseParticipant,
  requestTransitions,
  treatmentTransitions,
  getVetForUser,
} from './policies.js';

const requestSchema = z.object({
  farmId: z.string(),
  animalId: z.string(),
  requestedVeterinarianId: z.string(),
  observations: z.string().trim().min(3).max(5000),
  symptoms: z.string().trim().max(5000).optional().nullable(),
  urgency: z.enum(['ROUTINE', 'SOON', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
});
const messageSchema = z.object({ body: z.string().trim().min(1).max(5000) });
const diagnosisSchema = z.object({
  diseaseId: z.string().optional().nullable(),
  clinicalNotes: z.string().trim().min(3).max(10000),
  followUpNotes: z.string().trim().max(5000).optional().nullable(),
  diagnosedAt: z.coerce.date().optional(),
});
const itemSchema = z.object({
  drugId: z.string(),
  drugProductId: z.string().optional().nullable(),
  doseValue: z.number().positive(),
  doseUnit: z.string().trim().min(1).max(60),
  doseBasis: z.string().max(60).optional().nullable(),
  route: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  durationValue: z.number().positive(),
  durationUnit: z.string().trim().min(1).max(40),
  startDate: z.coerce.date(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  instructions: z.string().max(3000).optional().nullable(),
});
const prescriptionSchema = z.object({
  diagnosisId: z.string().optional().nullable(),
  instructions: z.string().max(5000).optional().nullable(),
  startDate: z.coerce.date(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  items: z.array(itemSchema).min(1).max(20),
});
const administrationSchema = z.object({
  prescriptionItemId: z.string().optional().nullable(),
  drugId: z.string(),
  drugProductId: z.string().optional().nullable(),
  amount: z.number().positive(),
  amountUnit: z.string().trim().min(1).max(60),
  activeIngredientMg: z.number().nonnegative().optional().nullable(),
  conversionProvenance: z.string().trim().max(255).optional().nullable(),
  route: z.string().trim().min(1).max(100),
  administeredAt: z.coerce.date(),
  animalWeightKg: z.number().positive().optional().nullable(),
  weightMeasuredAt: z.coerce.date().optional().nullable(),
  batchNumber: z.string().trim().max(120).optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
});
const requestInclude = {
  animal: { include: { species: true } },
  farm: { select: { id: true, name: true, district: true, state: true } },
  requestedVeterinarian: { include: { user: { select: { id: true, fullName: true } } } },
  veterinaryCase: true,
};
const caseInclude = {
  request: true,
  animal: { include: { species: true } },
  farm: true,
  veterinarian: { include: { user: { select: { id: true, fullName: true } } } },
  diagnoses: { include: { disease: true }, orderBy: { diagnosedAt: 'desc' } },
  prescriptions: {
    include: { items: { include: { drug: true } } },
    orderBy: { prescribedAt: 'desc' },
  },
  treatments: {
    include: { administrations: { include: { drug: true } } },
    orderBy: { createdAt: 'desc' },
  },
};

export const treatmentRequestsRouter = Router();
treatmentRequestsRouter.use(authenticate);
treatmentRequestsRouter.post(
  '/',
  validate(requestSchema),
  asyncHandler(async (req, res) => {
    await requireFarmAccess(req.principal.user.id, req.body.farmId, ['FARM_OWNER', 'FARM_MANAGER']);
    const animal = await prisma.animal.findFirst({
      where: { id: req.body.animalId, farmId: req.body.farmId },
    });
    const vet = await prisma.veterinarianProfile.findFirst({
      where: { id: req.body.requestedVeterinarianId, status: 'VERIFIED' },
      include: { user: true },
    });
    if (!animal) throw new AppError(400, 'ANIMAL_FARM_MISMATCH', 'Animal does not belong to farm');
    if (!vet)
      throw new AppError(400, 'VETERINARIAN_NOT_VERIFIED', 'Selected veterinarian is not verified');
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.treatmentRequest.create({
        data: { ...req.body, createdById: req.principal.user.id },
        include: requestInclude,
      });
      await tx.animalProfileEvent.create({
        data: {
          animalId: animal.id,
          actorUserId: req.principal.user.id,
          eventType: 'TREATMENT_REQUEST_CREATED',
          summary: 'Veterinary treatment requested',
          details: { requestId: created.id },
        },
      });
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: 'TREATMENT_REQUEST_CREATED',
          entityType: 'TreatmentRequest',
          entityId: created.id,
          farmId: req.body.farmId,
          requestId: req.id,
        },
        tx,
      );
      await createAlerts(tx, [vet.userId], {
        farmId: req.body.farmId,
        type: 'NEW_TREATMENT_REQUEST',
        title: 'New treatment request',
        message: `${created.farm.name} requested veterinary assistance`,
        entityType: 'TreatmentRequest',
        entityId: created.id,
      });
      return created;
    });
    res.status(201).json({ data: { request: item } });
  }),
);
treatmentRequestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = z
      .object({ scope: z.enum(['FARM', 'VETERINARIAN']).optional(), farmId: z.string().optional() })
      .parse(req.query);
    const vet = await prisma.veterinarianProfile.findUnique({
      where: { userId: req.principal.user.id },
    });
    let where;
    if (query.scope === 'FARM') {
      if (!query.farmId) throw new AppError(400, 'FARM_ID_REQUIRED', 'Farm ID is required');
      await requireFarmAccess(req.principal.user.id, query.farmId);
      where = { farmId: query.farmId };
    } else if (query.scope === 'VETERINARIAN') {
      const scopedVet = await getVetForUser(req.principal.user.id, false);
      where = { requestedVeterinarianId: scopedVet.id };
    } else {
      where = {
        OR: [
          { farm: { members: { some: { userId: req.principal.user.id, status: 'ACTIVE' } } } },
          ...(vet ? [{ requestedVeterinarianId: vet.id }] : []),
        ],
      };
    }
    res.json({
      data: {
        requests: await prisma.treatmentRequest.findMany({
          where,
          include: requestInclude,
          orderBy: { createdAt: 'desc' },
        }),
      },
    });
  }),
);
treatmentRequestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await prisma.treatmentRequest.findUnique({
      where: { id: req.params.id },
      include: {
        ...requestInclude,
        farm: {
          include: { members: { where: { userId: req.principal.user.id, status: 'ACTIVE' } } },
        },
      },
    });
    if (
      !item ||
      (item.requestedVeterinarian.userId !== req.principal.user.id &&
        item.farm.members.length === 0)
    )
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Treatment request not found');
    const attachments = await prisma.fileObject.findMany({
      where: { entityType: 'TREATMENT_REQUEST', entityId: item.id, status: 'AVAILABLE' },
      select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
    });
    res.json({ data: { request: { ...item, attachments } } });
  }),
);
treatmentRequestsRouter.patch(
  '/:id/status',
  validate(
    z.object({
      status: z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']),
      responseNotes: z.string().max(3000).optional().nullable(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const item = await prisma.treatmentRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requestedVeterinarian: true,
        farm: {
          include: { members: { where: { userId: req.principal.user.id, status: 'ACTIVE' } } },
        },
      },
    });
    if (!item) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Treatment request not found');
    assertTransition(requestTransitions, item.status, req.body.status);
    const isVet = item.requestedVeterinarian.userId === req.principal.user.id;
    if (req.body.status === 'CANCELLED') {
      const isRequester = item.createdById === req.principal.user.id;
      let canManage = false;
      if (item.farm.members.length) {
        const access = await requireFarmAccess(req.principal.user.id, item.farmId);
        canManage = access.roles.some((role) => ['FARM_OWNER', 'FARM_MANAGER'].includes(role));
      }
      if (!isRequester && !canManage)
        throw new AppError(403, 'FORBIDDEN', 'Requester or farm owner/manager required');
    } else if (!isVet || item.requestedVeterinarian.status !== 'VERIFIED')
      throw new AppError(
        403,
        'REQUESTED_VETERINARIAN_REQUIRED',
        'Requested verified veterinarian required',
      );
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.treatmentRequest.update({
        where: { id: item.id },
        data: {
          status: req.body.status,
          responseNotes: req.body.responseNotes,
          respondedAt: new Date(),
        },
        include: requestInclude,
      });
      let veterinaryCase = updated.veterinaryCase;
      if (req.body.status === 'ACCEPTED') {
        veterinaryCase = await tx.veterinaryCase.upsert({
          where: { requestId: item.id },
          create: {
            requestId: item.id,
            farmId: item.farmId,
            animalId: item.animalId,
            veterinarianId: item.requestedVeterinarianId,
          },
          update: {},
        });
        await tx.animalProfileEvent.create({
          data: {
            animalId: item.animalId,
            actorUserId: req.principal.user.id,
            eventType: 'VETERINARY_CASE_OPENED',
            summary: 'Veterinarian accepted request and opened case',
            details: { caseId: veterinaryCase.id },
          },
        });
      }
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: `TREATMENT_REQUEST_${req.body.status}`,
          entityType: 'TreatmentRequest',
          entityId: item.id,
          farmId: item.farmId,
          requestId: req.id,
          previousData: { status: item.status },
          newData: { status: req.body.status },
        },
        tx,
      );
      const farmUsers = await tx.farmMember.findMany({
        where: { farmId: item.farmId, status: 'ACTIVE' },
        select: { userId: true },
      });
      await createAlerts(
        tx,
        farmUsers.map((m) => m.userId),
        {
          farmId: item.farmId,
          type: `TREATMENT_REQUEST_${req.body.status}`,
          title: `Treatment request ${req.body.status.toLowerCase()}`,
          message: `Veterinarian ${req.body.status.toLowerCase()} the request`,
          entityType: 'TreatmentRequest',
          entityId: item.id,
        },
      );
      return { request: updated, veterinaryCase };
    });
    res.json({ data: result });
  }),
);

export const casesRouter = Router();
casesRouter.use(authenticate);
casesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = z
      .object({ scope: z.enum(['FARM', 'VETERINARIAN']).optional(), farmId: z.string().optional() })
      .parse(req.query);
    const vet = await prisma.veterinarianProfile.findUnique({
      where: { userId: req.principal.user.id },
    });
    let where;
    if (query.scope === 'FARM') {
      if (!query.farmId) throw new AppError(400, 'FARM_ID_REQUIRED', 'Farm ID is required');
      await requireFarmAccess(req.principal.user.id, query.farmId);
      where = { farmId: query.farmId };
    } else if (query.scope === 'VETERINARIAN') {
      const scopedVet = await getVetForUser(req.principal.user.id, false);
      where = { veterinarianId: scopedVet.id };
    } else {
      where = {
        OR: [
          { farm: { members: { some: { userId: req.principal.user.id, status: 'ACTIVE' } } } },
          ...(vet ? [{ veterinarianId: vet.id }] : []),
        ],
      };
    }
    res.json({
      data: {
        cases: await prisma.veterinaryCase.findMany({
          where,
          include: caseInclude,
          orderBy: { openedAt: 'desc' },
        }),
      },
    });
  }),
);
casesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await loadCaseParticipant(req.principal.user.id, req.params.id);
    res.json({
      data: {
        case: await prisma.veterinaryCase.findUnique({
          where: { id: req.params.id },
          include: caseInclude,
        }),
      },
    });
  }),
);
casesRouter.patch(
  '/:id/status',
  validate(
    z.object({
      status: z.enum(['IN_PROGRESS', 'TREATMENT_STARTED', 'FOLLOW_UP', 'COMPLETED', 'CANCELLED']),
    }),
  ),
  asyncHandler(async (req, res) => {
    const item = await assertAssignedVerifiedVet(req.principal.user.id, req.params.id);
    assertTransition(caseTransitions, item.status, req.body.status);
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.veterinaryCase.update({
        where: { id: item.id },
        data: {
          status: req.body.status,
          completedAt: req.body.status === 'COMPLETED' ? new Date() : null,
        },
      });
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: `VETERINARY_CASE_${req.body.status}`,
          entityType: 'VeterinaryCase',
          entityId: item.id,
          farmId: item.farmId,
          requestId: req.id,
        },
        tx,
      );
      return saved;
    });
    res.json({ data: { case: updated } });
  }),
);
casesRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    await loadCaseParticipant(req.principal.user.id, req.params.id);
    const messages = await prisma.caseMessage.findMany({
      where: { caseId: req.params.id },
      include: { sender: { select: { id: true, fullName: true } } },
      orderBy: { sentAt: 'asc' },
    });
    await prisma.caseMessage.updateMany({
      where: { caseId: req.params.id, senderId: { not: req.principal.user.id }, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ data: { messages } });
  }),
);
casesRouter.post(
  '/:id/messages',
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const item = await loadCaseParticipant(req.principal.user.id, req.params.id);
    const message = await prisma.$transaction(async (tx) => {
      const saved = await tx.caseMessage.create({
        data: { caseId: item.id, senderId: req.principal.user.id, body: req.body.body },
        include: { sender: { select: { id: true, fullName: true } } },
      });
      const farmUsers = await tx.farmMember.findMany({
        where: { farmId: item.farmId, status: 'ACTIVE', userId: { not: req.principal.user.id } },
        select: { userId: true },
      });
      const recipients =
        item.veterinarian.userId === req.principal.user.id
          ? farmUsers.map((m) => m.userId)
          : [item.veterinarian.userId];
      await createAlerts(tx, recipients, {
        farmId: item.farmId,
        type: 'NEW_CASE_MESSAGE',
        title: 'New case message',
        message: 'A participant sent a case message',
        entityType: 'VeterinaryCase',
        entityId: item.id,
      });
      return saved;
    });
    res.status(201).json({ data: { message } });
  }),
);
casesRouter.post(
  '/:id/diagnoses',
  validate(diagnosisSchema),
  asyncHandler(async (req, res) => {
    const item = await assertAssignedVerifiedVet(req.principal.user.id, req.params.id);
    if (
      req.body.diseaseId &&
      !(await prisma.disease.findUnique({ where: { id: req.body.diseaseId } }))
    )
      throw new AppError(400, 'DISEASE_NOT_FOUND', 'Disease reference not found');
    const diagnosis = await prisma.$transaction(async (tx) => {
      const saved = await tx.diagnosis.create({
        data: {
          ...req.body,
          caseId: item.id,
          animalId: item.animalId,
          veterinarianId: item.veterinarianId,
        },
      });
      await tx.animalProfileEvent.create({
        data: {
          animalId: item.animalId,
          actorUserId: req.principal.user.id,
          eventType: 'DIAGNOSIS_RECORDED',
          summary: 'Veterinarian recorded diagnosis',
          details: { diagnosisId: saved.id },
        },
      });
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: 'DIAGNOSIS_CREATED',
          entityType: 'Diagnosis',
          entityId: saved.id,
          farmId: item.farmId,
          requestId: req.id,
        },
        tx,
      );
      return saved;
    });
    res.status(201).json({ data: { diagnosis } });
  }),
);
casesRouter.post(
  '/:id/prescriptions',
  validate(prescriptionSchema),
  asyncHandler(async (req, res) => {
    const item = await assertAssignedVerifiedVet(req.principal.user.id, req.params.id);
    if (
      req.body.diagnosisId &&
      !(await prisma.diagnosis.findFirst({ where: { id: req.body.diagnosisId, caseId: item.id } }))
    )
      throw new AppError(400, 'DIAGNOSIS_CASE_MISMATCH', 'Diagnosis does not belong to case');
    const drugs = await prisma.drug.count({
      where: { id: { in: req.body.items.map((x) => x.drugId) } },
    });
    if (drugs !== new Set(req.body.items.map((x) => x.drugId)).size)
      throw new AppError(400, 'DRUG_NOT_FOUND', 'Drug reference not found');
    const { items, ...data } = req.body;
    const prescription = await prisma.$transaction(async (tx) => {
      const saved = await tx.prescription.create({
        data: {
          ...data,
          caseId: item.id,
          animalId: item.animalId,
          veterinarianId: item.veterinarianId,
          items: { create: items },
        },
        include: { items: { include: { drug: true } } },
      });
      await tx.animalProfileEvent.create({
        data: {
          animalId: item.animalId,
          actorUserId: req.principal.user.id,
          eventType: 'PRESCRIPTION_ISSUED',
          summary: 'Veterinarian issued prescription',
          details: { prescriptionId: saved.id },
        },
      });
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: 'PRESCRIPTION_CREATED',
          entityType: 'Prescription',
          entityId: saved.id,
          farmId: item.farmId,
          requestId: req.id,
        },
        tx,
      );
      const users = await tx.farmMember.findMany({
        where: { farmId: item.farmId, status: 'ACTIVE' },
        select: { userId: true },
      });
      await createAlerts(
        tx,
        users.map((x) => x.userId),
        {
          farmId: item.farmId,
          type: 'PRESCRIPTION_ISSUED',
          title: 'Prescription issued',
          message: 'A veterinarian issued a prescription',
          entityType: 'Prescription',
          entityId: saved.id,
        },
      );
      return saved;
    });
    res.status(201).json({ data: { prescription } });
  }),
);

export const treatmentsRouter = Router();
treatmentsRouter.use(authenticate);
treatmentsRouter.post(
  '/',
  validate(
    z.object({
      caseId: z.string(),
      prescriptionId: z.string(),
      notes: z.string().max(3000).optional().nullable(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const item = await assertAssignedVerifiedVet(req.principal.user.id, req.body.caseId);
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: req.body.prescriptionId,
        caseId: item.id,
        animalId: item.animalId,
        veterinarianId: item.veterinarianId,
      },
    });
    if (!prescription)
      throw new AppError(400, 'PRESCRIPTION_CASE_MISMATCH', 'Prescription does not belong to case');
    const treatment = await prisma.treatment.create({
      data: {
        ...req.body,
        animalId: item.animalId,
        farmId: item.farmId,
        veterinarianId: item.veterinarianId,
      },
    });
    res.status(201).json({ data: { treatment } });
  }),
);
treatmentsRouter.patch(
  '/:id/status',
  validate(
    z.object({
      status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']),
      notes: z.string().max(3000).optional().nullable(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const treatment = await prisma.treatment.findUnique({
      where: { id: req.params.id },
      include: { case: { include: { veterinarian: true } } },
    });
    if (
      !treatment ||
      treatment.case.veterinarian.userId !== req.principal.user.id ||
      treatment.case.veterinarian.status !== 'VERIFIED'
    )
      throw new AppError(
        403,
        'ASSIGNED_VETERINARIAN_REQUIRED',
        'Assigned verified veterinarian required',
      );
    assertTransition(treatmentTransitions, treatment.status, req.body.status);
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.treatment.update({
        where: { id: treatment.id },
        data: {
          status: req.body.status,
          startedAt: req.body.status === 'ACTIVE' ? new Date() : treatment.startedAt,
          completedAt: req.body.status === 'COMPLETED' ? new Date() : null,
          completionNotes:
            req.body.status === 'COMPLETED' ? req.body.notes : treatment.completionNotes,
        },
      });
      if (req.body.status === 'ACTIVE')
        await tx.veterinaryCase.update({
          where: { id: treatment.caseId },
          data: { status: 'TREATMENT_STARTED' },
        });
      await tx.animalProfileEvent.create({
        data: {
          animalId: treatment.animalId,
          actorUserId: req.principal.user.id,
          eventType: `TREATMENT_${req.body.status}`,
          summary: `Treatment ${req.body.status.toLowerCase()}`,
          details: { treatmentId: treatment.id },
        },
      });
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: `TREATMENT_${req.body.status}`,
          entityType: 'Treatment',
          entityId: treatment.id,
          farmId: treatment.farmId,
          requestId: req.id,
        },
        tx,
      );
      if (req.body.status === 'COMPLETED') {
        const users = await tx.farmMember.findMany({
          where: { farmId: treatment.farmId, status: 'ACTIVE' },
          select: { userId: true },
        });
        await createAlerts(
          tx,
          users.map((x) => x.userId),
          {
            farmId: treatment.farmId,
            type: 'TREATMENT_COMPLETED',
            title: 'Treatment completed',
            message: 'Veterinary treatment was completed',
            entityType: 'Treatment',
            entityId: treatment.id,
          },
        );
      }
      return saved;
    });
    await evaluateAndPersist(
      treatment.animalId,
      `TREATMENT_${req.body.status}`,
      req.principal.user.id,
    );
    res.json({ data: { treatment: updated } });
  }),
);
treatmentsRouter.post(
  '/:id/administrations',
  validate(administrationSchema),
  asyncHandler(async (req, res) => {
    if (req.body.activeIngredientMg != null && !req.body.conversionProvenance)
      throw new AppError(
        400,
        'CONVERSION_PROVENANCE_REQUIRED',
        'Conversion provenance is required with active-ingredient mass',
      );
    const treatment = await prisma.treatment.findUnique({
      where: { id: req.params.id },
      include: {
        case: { include: { veterinarian: true } },
        prescription: { include: { items: true } },
      },
    });
    if (!treatment || treatment.status !== 'ACTIVE')
      throw new AppError(409, 'ACTIVE_TREATMENT_REQUIRED', 'Treatment must be active');
    const isVet =
      treatment.case.veterinarian.userId === req.principal.user.id &&
      treatment.case.veterinarian.status === 'VERIFIED';
    if (!isVet)
      await requireFarmAccess(req.principal.user.id, treatment.farmId, [
        'FARM_OWNER',
        'FARM_MANAGER',
        'FARM_WORKER',
      ]);
    if (req.body.prescriptionItemId) {
      const pi = treatment.prescription?.items.find((x) => x.id === req.body.prescriptionItemId);
      if (!pi || pi.drugId !== req.body.drugId)
        throw new AppError(
          400,
          'PRESCRIPTION_ITEM_MISMATCH',
          'Prescription item does not match treatment and drug',
        );
    }
    const administration = await prisma.$transaction(async (tx) => {
      const saved = await tx.treatmentAdministration.create({
        data: {
          ...req.body,
          treatmentId: treatment.id,
          animalId: treatment.animalId,
          administeredById: req.principal.user.id,
        },
      });
      await tx.animalProfileEvent.create({
        data: {
          animalId: treatment.animalId,
          actorUserId: req.principal.user.id,
          eventType: 'TREATMENT_ADMINISTERED',
          summary: 'Treatment administration recorded',
          details: { administrationId: saved.id, treatmentId: treatment.id },
        },
      });
      await appendAudit(
        {
          actorUserId: req.principal.user.id,
          action: 'TREATMENT_ADMINISTRATION_RECORDED',
          entityType: 'TreatmentAdministration',
          entityId: saved.id,
          farmId: treatment.farmId,
          requestId: req.id,
        },
        tx,
      );
      return saved;
    });
    await evaluateAndPersist(
      treatment.animalId,
      'TREATMENT_ADMINISTRATION_RECORDED',
      req.principal.user.id,
    );
    res.status(201).json({ data: { administration } });
  }),
);

export const referenceClinicalRouter = Router();
referenceClinicalRouter.use(authenticate);
referenceClinicalRouter.get(
  '/diseases',
  asyncHandler(async (_req, res) =>
    res.json({
      data: { diseases: await prisma.disease.findMany({ orderBy: { canonicalName: 'asc' } }) },
    }),
  ),
);
referenceClinicalRouter.get(
  '/drugs',
  asyncHandler(async (_req, res) =>
    res.json({
      data: {
        drugs: await prisma.drug.findMany({
          include: { antimicrobialClass: true },
          orderBy: { canonicalName: 'asc' },
        }),
      },
    }),
  ),
);

export const alertsRouter = Router();
alertsRouter.use(authenticate);
alertsRouter.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      data: {
        alerts: await prisma.alert.findMany({
          where: { userId: req.principal.user.id },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      },
    }),
  ),
);
alertsRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const alert = await prisma.alert.updateMany({
      where: { id: req.params.id, userId: req.principal.user.id },
      data: { status: 'READ', readAt: new Date() },
    });
    if (!alert.count) throw new AppError(404, 'ALERT_NOT_FOUND', 'Alert not found');
    res.status(204).send();
  }),
);
