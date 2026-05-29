import { NextResponse } from "next/server";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stub for future auto-release: automatically release seller payouts for orders
// that have been in DELIVERED status for N days without an admin manually
// releasing them. Intended as a safety net, not the primary release path.
//
// Implementation sketch:
//   1. Find OrderItems where payoutReleasedAt IS NULL and order.status = DELIVERED
//      and order.updatedAt < now() - AUTO_RELEASE_DAYS.
//   2. For each item call stripe.transfers.create (same logic as /api/admin/orders/[id]/release).
//   3. Write stripeTransferId + payoutReleasedAt, fire PAYOUT_SENT notification.
//
// Wire this route into vercel.json once the delivery provider webhook is live
// and AUTO_RELEASE_DAYS is decided with legal/ops.

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;

  if (expectedToken && authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Not yet implemented — see comments above.
  return NextResponse.json({ released: 0, note: "auto-release not yet active" });
}
