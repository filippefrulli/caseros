import Stripe from "stripe";
import { env } from "@/env";

// Pinned to the SDK's bundled version (v22.1.1 → 2026-04-22.dahlia). Bump
// deliberately when upgrading the `stripe` package — never let it float.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});
