import dotenv from 'dotenv';
import { z } from 'zod';

// Make `.env` authoritative: dotenv does not override already-set vars, and the
// IDE/host injects a PORT that would otherwise clobber the .env value.
dotenv.config({ override: true });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:4200'),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  ACCESS_TOKEN_TTL: z.coerce.number().default(900), // seconds
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  UPLOAD_DIR: z.string().default('uploads'),
  ATTENDANCE_THRESHOLD: z.coerce.number().min(1).max(100).default(75),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;