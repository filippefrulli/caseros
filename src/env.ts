import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    ADMIN_EMAIL: z.string().email(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM: z.string().optional(),
    CRON_SECRET: z.string().min(16),
    MEILISEARCH_HOST: z.string().url().optional(),
    MEILISEARCH_ADMIN_KEY: z.string().optional(),
    SHIPPO_API_KEY: z.string().optional(),
    SENDCLOUD_PUBLIC_KEY: z.string().optional(),
    SENDCLOUD_PRIVATE_KEY: z.string().optional(),
    // Selects which shipping provider is active. Default "shippo"; set to
    // "sendcloud" to switch. Reverting is a one-line change here.
    SHIPPING_PROVIDER: z.enum(["shippo", "sendcloud"]).default("shippo"),
    // Self-managed shipping: days after an order is marked SHIPPED before the
    // payout auto-releases when the buyer never confirms receipt.
    AUTO_RELEASE_DAYS: z.coerce.number().int().positive().default(7),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    CRON_SECRET: process.env.CRON_SECRET,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
    MEILISEARCH_ADMIN_KEY: process.env.MEILISEARCH_ADMIN_KEY,
    SHIPPO_API_KEY: process.env.SHIPPO_API_KEY,
    SENDCLOUD_PUBLIC_KEY: process.env.SENDCLOUD_PUBLIC_KEY,
    SENDCLOUD_PRIVATE_KEY: process.env.SENDCLOUD_PRIVATE_KEY,
    SHIPPING_PROVIDER: process.env.SHIPPING_PROVIDER,
    AUTO_RELEASE_DAYS: process.env.AUTO_RELEASE_DAYS,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
