import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { releaseOrderPayout } from "@/lib/payouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safety net for self-managed shipping: with no carrier tracking, an order is
// completed when the buyer confirms receipt. If they never do, this releases the
// seller payout AUTO_RELEASE_DAYS after the order was marked SHIPPED, so sellers
// aren't left unpaid. Marks the order DELIVERED, then releases.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - env.AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);

  const dueOrders = await prisma.order.findMany({
    where: {
      status: "SHIPPED",
      shippedAt: { not: null, lt: cutoff },
    },
    orderBy: { shippedAt: "asc" },
    take: 200,
    select: { id: true },
  });

  let released = 0;
  for (const { id } of dueOrders) {
    try {
      await prisma.order.update({ where: { id }, data: { status: "DELIVERED" } });
      await releaseOrderPayout(id);
      released++;
    } catch (err) {
      console.error(`[auto-release] failed for order ${id}:`, err);
    }
  }

  return NextResponse.json({ released });
}
