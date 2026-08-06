'use strict';

const { z } = require('zod');

/**
 * Env validation schema.
 * Executed once at startup in server.js — fails fast with a clear error message.
 * Seam: swap this module to use a different validation library without touching the rest.
 */
const envSchema = z.object({
  NODE_ENV:              z.enum(['development', 'test', 'production']).default('development'),
  PORT:                  z.string().regex(/^\d+$/, 'PORT must be a number').default('3000'),
  HOST:                  z.string().default('0.0.0.0'),

  // ── Database ──────────────────────────────────────────────────────────────
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET:  z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES:z.string().default('7d'),

  // ── Session ───────────────────────────────────────────────────────────────
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be >= 32 chars'),

  // ── Google OAuth (optional — skips strategy if absent) ───────────────────
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL:  z.string().url().optional(),

  // ── Cloudinary (optional) ─────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY:    z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ── OpenAI (optional) ─────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().optional(),

  // ── VNPay Sandbox (optional) ──────────────────────────────────────────────
  VNPAY_TMN_CODE:    z.string().optional(),
  VNPAY_HASH_SECRET: z.string().optional(),
  VNPAY_URL:         z.string().url().optional().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNPAY_RETURN_URL:  z.string().optional(),

  // ── Misc ──────────────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

/**
 * @throws {never} Calls process.exit(1) on validation failure
 * @returns {z.infer<typeof envSchema>}
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`\n❌  Environment validation failed:\n${errors}\n`);
    process.exit(1);
  }

  return result.data;
}

module.exports = { validateEnv };
