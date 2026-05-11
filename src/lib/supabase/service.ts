import { createClient } from "@supabase/supabase-js";

// Bypass RLS — server-side admin actions only. Never expose to the client.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
