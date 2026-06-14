import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by Vercel Cron (see vercel.json). Also safe to call manually.
// Cancels PENDING orders older than 24 h that were never paid, these are
// abandoned Stripe Checkout sessions. No charge exists so no refund is needed
// and no stock was reserved.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.order.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    data: { status: "CANCELLED" },
  });

  console.log(`[cron] cleanup-pending-orders: cancelled ${result.count} stale orders`);
  return NextResponse.json({ cancelled: result.count });
}
