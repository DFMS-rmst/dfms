import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

export const s3Client = new S3Client({ region: env.AWS_REGION || 'ap-south-1' });
export function assertS3Configured() {
  if (!env.AWS_REGION || !env.AWS_S3_BUCKET) throw new Error('S3_NOT_CONFIGURED');
}
