import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { cancelShipment } from "@/lib/shipping";
import { env } from "@/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  // Amount in cents. Omit for a full refund.
  amount: z.coerce.number().int().positive().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { amount } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!order.stripePaymentIntentId) {
    return NextResponse.json({ error: "No payment intent on order." }, { status: 409 });
  }
  if (order.status === "REFUNDED" || order.status === "CANCELLED") {
    return NextResponse.json({ error: "Order is already refunded or cancelled." }, { status: 409 });
  }

  // Void the shipping label when the order was already shipped so the carrier
  // cost is refunded back to the platform account. Non-fatal — log and continue.
  if (order.status === "SHIPPED" && order.shippingTransactionId) {
    try {
      await cancelShipment(order.shippingProvider, order.shippingTransactionId);
    } catch (err) {
      console.error(`[refund] label void failed for ${order.shippingTransactionId}:`, err);
    }
  }

  // If any item's payout was already transferred, reverse those transfers first.
  // We must reverse before refunding so Stripe can debit the connected account.
  for (const item of order.items) {
    if (!item.stripeTransferId) continue;

    const reversalAmount = amount
      ? Math.min(amount, item.sellerPayout - item.refundedAmount)
      : undefined; // full reversal

    try {
      await stripe.transfers.createReversal(item.stripeTransferId, {
        ...(reversalAmount !== undefined && { amount: reversalAmount }),
      });
    } catch (err) {
      console.error(`[refund] transfer reversal failed for ${item.stripeTransferId}:`, err);
      return NextResponse.json({ error: "Transfer reversal failed. Check Stripe logs." }, { status: 502 });
    }
  }

  // Issue the refund on the payment intent (charges live on the platform account).
  try {
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      ...(amount !== undefined && { amount }),
    });
  } catch (err) {
    console.error(`[refund] refund creation failed for ${order.stripePaymentIntentId}:`, err);
    return NextResponse.json({ error: "Refund creation failed. Check Stripe logs." }, { status: 502 });
  }

  // charge.refunded webhook will update refundedAmount and flip status to REFUNDED.
  return NextResponse.json({ ok: true });
}
