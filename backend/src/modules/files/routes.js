import crypto from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { env } from '../../config/env.js';
import { assertS3Configured, s3Client } from '../../infrastructure/s3/client.js';
import { prisma } from '../../infrastructure/prisma/client.js';

export const allowedMimeTypes = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);
const uploadSchema = z.object({
  entityType: z.literal('VETERINARIAN_PROFILE'),
  entityId: z.string().min(1),
  purpose: z.literal('REGISTRATION_CERTIFICATE'),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  originalFilename: z.string().max(255).optional(),
});
export function validatePrivateFile({ mimeType, sizeBytes }) {
  if (!allowedMimeTypes.has(mimeType))
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF, JPEG, and PNG files are allowed');
  if (sizeBytes > env.MAX_PRIVATE_FILE_SIZE_BYTES)
    throw new AppError(
      400,
      'FILE_TOO_LARGE',
      `File exceeds ${env.MAX_PRIVATE_FILE_SIZE_BYTES} bytes`,
    );
}
async function authorizeProfile(userId, profileId, platformRoles) {
  const profile = await prisma.veterinarianProfile.findUnique({ where: { id: profileId } });
  if (!profile || (profile.userId !== userId && !platformRoles.includes('PLATFORM_ADMIN')))
    throw new AppError(404, 'FILE_ENTITY_NOT_FOUND', 'File entity not found');
  return profile;
}
export const filesRouter = Router();
filesRouter.use(authenticate);
filesRouter.post(
  '/upload-intents',
  validate(uploadSchema),
  asyncHandler(async (request, response) => {
    validatePrivateFile(request.body);
    const profile = await authorizeProfile(
      request.principal.user.id,
      request.body.entityId,
      request.principal.platformRoles,
    );
    if (profile.userId !== request.principal.user.id)
      throw new AppError(403, 'FORBIDDEN', 'Only the veterinarian may upload their credential');
    try {
      assertS3Configured();
    } catch {
      throw new AppError(503, 'S3_NOT_CONFIGURED', 'Private storage is not configured');
    }
    const extension = allowedMimeTypes.get(request.body.mimeType);
    const objectKey = `${env.NODE_ENV}/veterinarian-credentials/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const file = await prisma.fileObject.create({
      data: {
        bucket: env.AWS_S3_BUCKET,
        objectKey,
        mimeType: request.body.mimeType,
        extension,
        sizeBytes: BigInt(request.body.sizeBytes),
        ownerUserId: request.principal.user.id,
        veterinarianProfileId: profile.id,
        entityType: request.body.entityType,
        entityId: profile.id,
        purpose: request.body.purpose,
      },
    });
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: objectKey,
        ContentType: request.body.mimeType,
        ContentLength: request.body.sizeBytes,
      }),
      { expiresIn: env.S3_PRESIGNED_URL_EXPIRY_SECONDS },
    );
    response.status(201).json({
      data: {
        file: {
          id: file.id,
          status: file.status,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
        },
        uploadUrl,
        expiresIn: env.S3_PRESIGNED_URL_EXPIRY_SECONDS,
      },
    });
  }),
);
filesRouter.post(
  '/:fileId/complete',
  asyncHandler(async (request, response) => {
    const file = await prisma.fileObject.findUnique({ where: { id: request.params.fileId } });
    if (!file || file.ownerUserId !== request.principal.user.id)
      throw new AppError(404, 'FILE_NOT_FOUND', 'File not found');
    try {
      assertS3Configured();
    } catch {
      throw new AppError(503, 'S3_NOT_CONFIGURED', 'Private storage is not configured');
    }
    const object = await s3Client.send(
      new HeadObjectCommand({ Bucket: file.bucket, Key: file.objectKey }),
    );
    if (object.ContentLength !== Number(file.sizeBytes) || object.ContentType !== file.mimeType)
      throw new AppError(
        409,
        'FILE_METADATA_MISMATCH',
        'Uploaded object does not match the approved file metadata',
      );
    const updated = await prisma.fileObject.update({
      where: { id: file.id },
      data: { status: 'AVAILABLE', availableAt: new Date() },
    });
    response.json({ data: { file: { id: updated.id, status: updated.status } } });
  }),
);
filesRouter.post(
  '/:fileId/download-intents',
  asyncHandler(async (request, response) => {
    const file = await prisma.fileObject.findUnique({ where: { id: request.params.fileId } });
    if (
      !file ||
      (file.ownerUserId !== request.principal.user.id &&
        !request.principal.platformRoles.includes('PLATFORM_ADMIN'))
    )
      throw new AppError(404, 'FILE_NOT_FOUND', 'File not found');
    if (file.status !== 'AVAILABLE')
      throw new AppError(409, 'FILE_UNAVAILABLE', 'File upload is not complete');
    try {
      assertS3Configured();
    } catch {
      throw new AppError(503, 'S3_NOT_CONFIGURED', 'Private storage is not configured');
    }
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: file.bucket, Key: file.objectKey }),
      { expiresIn: env.S3_PRESIGNED_URL_EXPIRY_SECONDS },
    );
    response.json({ data: { downloadUrl, expiresIn: env.S3_PRESIGNED_URL_EXPIRY_SECONDS } });
  }),
);
