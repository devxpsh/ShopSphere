import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://postgres:postgres@localhost:5432/shopsphere?schema=public'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
    .default('dev-only-shopsphere-jwt-access-secret-key-2026-local'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default('dev-only-shopsphere-jwt-refresh-secret-key-2026-local'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CSRF_SECRET: z
    .string()
    .min(16, 'CSRF_SECRET must be at least 16 characters')
    .default('dev-only-shopsphere-csrf-secret-key-2026-local'),
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  PAYMENT_PROVIDER: z.enum(['MOCK', 'RAZORPAY']).default('MOCK'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@shopsphere.in'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('AdminPassword123!'),
  SEED_CUSTOMER_EMAIL: z.string().email().default('aarav.sharma@example.in'),
  SEED_CUSTOMER_PASSWORD: z.string().min(8).default('CustomerPassword123!'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

// Security rule: never allow default dev secrets in production
if (
  parsedEnv.data.NODE_ENV === 'production' &&
  (parsedEnv.data.JWT_ACCESS_SECRET.includes('dev-only') ||
    parsedEnv.data.JWT_REFRESH_SECRET.includes('dev-only') ||
    parsedEnv.data.CSRF_SECRET.includes('dev-only'))
) {
  console.error('❌ Fatal Security Error: Default development secrets are forbidden in production.');
  process.exit(1);
}

export const env = parsedEnv.data;
