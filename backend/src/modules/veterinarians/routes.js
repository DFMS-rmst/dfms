import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePlatformRole } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { appendAudit } from '../audit/index.js';

const profileSchema = z.object({
  registrationNumber: z.string().trim().min(2).max(100),
  registrationCouncil: z.string().trim().min(2).max(160),
  qualification: z.string().trim().min(2).max(255),
  specialization: z.string().trim().max(160).optional().nullable(),
  experienceYears: z.number().int().min(0).max(80).optional().nullable(),
  serviceAreas: z
    .array(
      z.object({
        state: z.string().trim().min(2).max(100),
        district: z.string().trim().max(100).optional().nullable(),
        taluka: z.string().trim().max(100).optional().nullable(),
        pincode: z
          .string()
          .regex(/^\d{6}$/)
          .optional()
          .nullable(),
      }),
    )
    .min(1)
    .max(20),
});
const reviewSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED']),
  reviewNotes: z.string().trim().max(3000).optional().nullable(),
});
const profileInclude = {
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  serviceAreas: true,
  documents: {
    select: {
      id: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      purpose: true,
      createdAt: true,
    },
  },
};
export const veterinariansRouter = Router();
veterinariansRouter.use(authenticate);
veterinariansRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = z
      .object({
        state: z.string().max(100).optional(),
        district: z.string().max(100).optional(),
        specialization: z.string().max(160).optional(),
        name: z.string().max(160).optional(),
      })
      .parse(request.query);
    const veterinarians = await prisma.veterinarianProfile.findMany({
      where: {
        status: 'VERIFIED',
        ...(query.specialization ? { specialization: { contains: query.specialization } } : {}),
        ...(query.name ? { user: { fullName: { contains: query.name } } } : {}),
        ...(query.state || query.district
          ? {
              serviceAreas: {
                some: {
                  ...(query.state ? { state: query.state } : {}),
                  ...(query.district ? { district: query.district } : {}),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        qualification: true,
        specialization: true,
        experienceYears: true,
        status: true,
        user: { select: { fullName: true } },
        serviceAreas: { select: { state: true, district: true, taluka: true, pincode: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
    });
    response.json({ data: { veterinarians } });
  }),
);
veterinariansRouter.get(
  '/me',
  asyncHandler(async (request, response) =>
    response.json({
      data: {
        profile: await prisma.veterinarianProfile.findUnique({
          where: { userId: request.principal.user.id },
          include: profileInclude,
        }),
      },
    }),
  ),
);
veterinariansRouter.put(
  '/me',
  validate(profileSchema),
  asyncHandler(async (request, response) => {
    const { serviceAreas, ...data } = request.body;
    const profile = await prisma.$transaction(async (tx) => {
      const existing = await tx.veterinarianProfile.findUnique({
        where: { userId: request.principal.user.id },
      });
      const saved = await tx.veterinarianProfile.upsert({
        where: { userId: request.principal.user.id },
        create: {
          ...data,
          userId: request.principal.user.id,
          status: 'PENDING',
          serviceAreas: { create: serviceAreas },
        },
        update: {
          ...data,
          status: existing?.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
          reviewedById: null,
          reviewedAt: null,
          reviewNotes: null,
          serviceAreas: { deleteMany: {}, create: serviceAreas },
        },
        include: profileInclude,
      });
      await tx.userPlatformRole.upsert({
        where: { userId_role: { userId: request.principal.user.id, role: 'VETERINARIAN' } },
        create: { userId: request.principal.user.id, role: 'VETERINARIAN' },
        update: {},
      });
      await appendAudit(
        {
          actorUserId: request.principal.user.id,
          action: 'VETERINARIAN_VERIFICATION_SUBMITTED',
          entityType: 'VeterinarianProfile',
          entityId: saved.id,
          requestId: request.id,
          newData: { status: saved.status },
        },
        tx,
      );
      return saved;
    });
    response.json({ data: { profile } });
  }),
);

export const adminVeterinariansRouter = Router();
adminVeterinariansRouter.use(authenticate, requirePlatformRole('PLATFORM_ADMIN'));
adminVeterinariansRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const status = request.query.status || 'PENDING';
    if (!['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status))
      throw new AppError(400, 'INVALID_STATUS', 'Invalid veterinarian status');
    response.json({
      data: {
        veterinarians: await prisma.veterinarianProfile.findMany({
          where: { status },
          include: profileInclude,
          orderBy: { updatedAt: 'asc' },
        }),
      },
    });
  }),
);
adminVeterinariansRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const profile = await prisma.veterinarianProfile.findUnique({
      where: { id: request.params.id },
      include: profileInclude,
    });
    if (!profile) throw new AppError(404, 'VETERINARIAN_NOT_FOUND', 'Veterinarian not found');
    response.json({ data: { profile } });
  }),
);
adminVeterinariansRouter.patch(
  '/:id/verification',
  validate(reviewSchema),
  asyncHandler(async (request, response) => {
    const before = await prisma.veterinarianProfile.findUnique({
      where: { id: request.params.id },
    });
    if (!before) throw new AppError(404, 'VETERINARIAN_NOT_FOUND', 'Veterinarian not found');
    const profile = await prisma.$transaction(async (tx) => {
      const updated = await tx.veterinarianProfile.update({
        where: { id: before.id },
        data: {
          status: request.body.status,
          reviewNotes: request.body.reviewNotes,
          reviewedById: request.principal.user.id,
          reviewedAt: new Date(),
        },
        include: profileInclude,
      });
      await appendAudit(
        {
          actorUserId: request.principal.user.id,
          action: `VETERINARIAN_${request.body.status}`,
          entityType: 'VeterinarianProfile',
          entityId: before.id,
          requestId: request.id,
          previousData: { status: before.status },
          newData: { status: updated.status, reviewNotes: updated.reviewNotes },
        },
        tx,
      );
      return updated;
    });
    response.json({ data: { profile } });
  }),
);
