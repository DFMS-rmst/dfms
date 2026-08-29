import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PRESIGNED_URL_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  MAX_PRIVATE_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10_485_760),
  BLOCKCHAIN_RPC_URL: z.string().url().optional().or(z.literal('')),
  BLOCKCHAIN_PRIVATE_KEY: z.string().optional(),
  BLOCKCHAIN_CONTRACT_ADDRESS: z.string().optional(),
  BLOCKCHAIN_NETWORK: z.string().default('hardhat-local'),
  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  LLM_PROVIDER: z.enum(['OPENAI_COMPATIBLE']).default('OPENAI_COMPATIBLE'),
  LLM_API_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4.1-mini'),
});

export const env = schema.parse(process.env);
