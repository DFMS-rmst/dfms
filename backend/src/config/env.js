import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === '' || val === undefined ? undefined : val), schema);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: emptyToUndefined(z.coerce.number().int().positive().default(3000)),
  FRONTEND_URL: emptyToUndefined(z.string().url().default('http://localhost:5173')),
  APP_BASE_URL: emptyToUndefined(z.string().url().default('http://localhost:5173')),
  DATABASE_URL: emptyToUndefined(
    z.string().min(1).default('mysql://farm_app:farm_app_local_password@127.0.0.1:3307/digital_farm'),
  ),
  JWT_SECRET: emptyToUndefined(
    z.string().min(32).default('local-docker-jwt-secret-change-me-25007'),
  ),
  JWT_EXPIRES_IN: emptyToUndefined(z.string().default('15m')),
  REFRESH_TOKEN_TTL_DAYS: emptyToUndefined(z.coerce.number().int().positive().default(7)),
  AWS_REGION: emptyToUndefined(z.string().optional()),
  AWS_S3_BUCKET: emptyToUndefined(z.string().optional()),
  AWS_ACCESS_KEY_ID: emptyToUndefined(z.string().optional()),
  AWS_SECRET_ACCESS_KEY: emptyToUndefined(z.string().optional()),
  S3_PRESIGNED_URL_EXPIRY_SECONDS: emptyToUndefined(
    z.coerce.number().int().min(60).max(900).default(300),
  ),
  MAX_PRIVATE_FILE_SIZE_BYTES: emptyToUndefined(
    z.coerce.number().int().positive().default(10_485_760),
  ),
  BLOCKCHAIN_RPC_URL: emptyToUndefined(z.string().url().optional().or(z.literal(''))),
  BLOCKCHAIN_PRIVATE_KEY: emptyToUndefined(z.string().optional()),
  BLOCKCHAIN_CONTRACT_ADDRESS: emptyToUndefined(z.string().optional()),
  BLOCKCHAIN_NETWORK: emptyToUndefined(z.string().default('hardhat-local')),
  ML_SERVICE_URL: emptyToUndefined(z.string().url().default('http://localhost:8000')),
  LLM_PROVIDER: emptyToUndefined(z.enum(['OPENAI_COMPATIBLE']).default('OPENAI_COMPATIBLE')),
  LLM_API_URL: emptyToUndefined(z.string().url().default('https://api.openai.com/v1')),
  LLM_API_KEY: emptyToUndefined(z.string().optional()),
  LLM_MODEL: emptyToUndefined(z.string().default('gpt-4.1-mini')),
});

export const env = schema.parse(process.env);
