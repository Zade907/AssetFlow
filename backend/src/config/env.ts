import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://assetflow:assetflow@localhost:5433/assetflow?schema=public"),
  JWT_SECRET: z.string().min(16).default("assetflow-local-development-secret"),
  JWT_EXPIRES_IN: z.string().min(1).default("8h"),
  CORS_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

if (parsed.data.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

// Prisma reads DATABASE_URL directly from process.env when it initializes.
// Mirror the validated development default so the root workspace command works
// before a local .env file is copied; explicit environment values still win.
process.env.DATABASE_URL ??= parsed.data.DATABASE_URL;

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
