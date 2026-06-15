import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendOrderCancelledEmail, sendAdminOrderCancelledEmail } from "@/lib/email";
import { env } from "@/env";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

// Seller cancels an order they can't fulfil (e.g. shipping to the buyer's
// country is too difficult/expensive) and the buyer is fully refunded.
//
// Restricted to PROCESSING (after payment, before the order is marked sent /
// a label is generated). In that window no payout has been released and no
// carrier label exists, so there's nothing to reverse or void — just refund
// the charge, restore stock, and notify.
export async function POST(req: Request, { params }: Params) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sellerProfile = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
    select: { id: true, userId: true, shopName: true },
  });
  if (!sellerProfile) return NextResponse.json({ error: "Seller profile not found." }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A cancellation reason is required." }, { status: 400 });
  }
  const { reason } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      stripePaymentIntentId: true,
      buyer: { select: { id: true, email: true, name: true } },
      items: { select: { sellerId: true, listingId: true, quantity: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.items.every((i) => i.sellerId === sellerProfile.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (order.status !== "PROCESSING") {
    return NextResponse.json({ error: "Only orders awaiting shipment can be cancelled." }, { status: 409 });
  }
  if (!order.stripePaymentIntentId) {
    return NextResponse.json({ error: "No payment intent on order." }, { status: 409 });
  }

  // Claim the cancellation atomically: flips PROCESSING -> CANCELLED in a single
  // conditional write. Serializes double-clicks and races the charge.refunded
  // webhook so it sees CANCELLED and skips its own status flip / notification.
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "PROCESSING" },
    data: { status: "CANCELLED", cancellationReason: reason, cancelledAt: new Date() },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Order can no longer be cancelled." }, { status: 409 });
  }

  // Full refund (no amount = item price + shipping), pulled from the platform
  // balance. If it fails, revert the claim so a buyer is never left un-refunded
  // on a CANCELLED order.
  try {
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  } catch (err) {
    console.error(`[seller-cancel] refund failed for ${order.stripePaymentIntentId}:`, err);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PROCESSING", cancellationReason: null, cancelledAt: null },
    });
    return NextResponse.json({ error: "Refund failed. Please try again." }, { status: 502 });
  }

  // Restore stock and relist: the item was never actually sold. Mirrors the
  // inverse of the stock decrement in the payment_intent.succeeded webhook.
  for (const item of order.items) {
    if (!item.listingId) continue; // listing deleted since purchase
    await prisma.listing.update({
      where: { id: item.listingId },
      data: { stock: { increment: item.quantity } },
    });
    await prisma.listing.updateMany({
      where: { id: item.listingId, status: "SOLD_OUT" },
      data: { status: "ACTIVE" },
    });
  }

  await prisma.notification.create({
    data: {
      userId: order.buyer.id,
      type: "ORDER_CANCELLED",
      title: "Order cancelled and refunded",
      body: "The seller was unable to fulfil your order and has cancelled it. Your card has been refunded in full.",
      entityType: "order",
      entityId: order.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: sellerProfile.userId,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      body: `You cancelled order #${order.id.slice(-8).toUpperCase()} and the buyer was refunded.`,
      entityType: "order",
      entityId: order.id,
    },
  });

  await Promise.all([
    sendOrderCancelledEmail({
      to: order.buyer.email,
      buyerName: order.buyer.name,
      orderId: order.id,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }),
    sendAdminOrderCancelledEmail({
      orderId: order.id,
      shopName: sellerProfile.shopName,
      reason,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
