import Stripe from "stripe";
import { env } from "@/env";

// Pinned to the SDK's bundled version (v22.2.0 → 2026-05-27.dahlia). Bump
// deliberately when upgrading the `stripe` package, never let it float.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});
