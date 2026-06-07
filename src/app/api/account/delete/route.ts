import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDeletionEligibility, anonymiseAccount } from "@/lib/gdpr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eligibility = await checkDeletionEligibility(user.id);
  if (!eligibility.eligible) {
    return NextResponse.json({ error: eligibility.reason }, { status: 409 });
  }

  await anonymiseAccount(user.id);
  return NextResponse.json({ ok: true });
}
