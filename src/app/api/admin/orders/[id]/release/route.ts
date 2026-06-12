import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { releaseOrderPayout } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, stripeChargeId: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Order must be DELIVERED before releasing payout" }, { status: 409 });
  }
  if (!order.stripeChargeId) {
    return NextResponse.json({ error: "No charge ID on order — cannot create transfer" }, { status: 409 });
  }

  await releaseOrderPayout(id);
  return NextResponse.json({ ok: true });
}
