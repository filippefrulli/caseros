import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { sendPayoutReleasedEmail } from "@/lib/email";

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
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Order must be DELIVERED before releasing payout" }, { status: 409 });
  }
  if (!order.stripeChargeId) {
    return NextResponse.json({ error: "No charge ID on order — cannot create transfer" }, { status: 409 });
  }

  // Look up seller user IDs for notifications (sellerId is a SellerProfile id)
  const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
  const sellerProfiles = await prisma.sellerProfile.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, userId: true, shopName: true, user: { select: { email: true } } },
  });
  const sellerProfileMap = new Map(sellerProfiles.map((s) => [s.id, s]));

  const releasedAt = new Date();

  await Promise.all(
    order.items.map(async (item) => {
      if (item.stripeTransferId) return; // already released

      if (!item.sellerStripeAccountId) {
        console.warn(`[release] item ${item.id} has no sellerStripeAccountId — skipping`);
        return;
      }

      const transfer = await stripe.transfers.create({
        amount: item.sellerPayout,
        currency: item.currency.toLowerCase(),
        destination: item.sellerStripeAccountId,
        source_transaction: order.stripeChargeId!,
        transfer_group: order.id,
      });

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          stripeTransferId: transfer.id,
          payoutReleasedAt: releasedAt,
        },
      });

      const sellerProfile = sellerProfileMap.get(item.sellerId);
      if (sellerProfile) {
        await prisma.notification.create({
          data: {
            userId: sellerProfile.userId,
            type: "PAYOUT_SENT",
            title: "Payout released",
            body: `Your payout for order #${order.id.slice(-8).toUpperCase()} has been sent to your Stripe account.`,
            entityType: "order",
            entityId: order.id,
          },
        });
        await sendPayoutReleasedEmail({
          to: sellerProfile.user.email,
          shopName: sellerProfile.shopName,
          orderId: order.id,
          itemId: item.id,
          payoutAmount: item.sellerPayout,
          currency: item.currency,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        });
      }
    }),
  );

  return NextResponse.json({ ok: true });
}
