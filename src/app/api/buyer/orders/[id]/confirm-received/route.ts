import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { releaseOrderPayout } from "@/lib/payouts";
import { sendOrderDeliveredEmail } from "@/lib/email";
import { env } from "@/env";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Buyer confirms they received the order. Completes the order and releases the
// seller payout, the receipt handshake that replaces carrier tracking in
// self-managed shipping mode.
export async function POST(_req: Request, { params }: Params) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found." }, { status: 403 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      buyerId: true,
      totalAmount: true,
      currency: true,
      buyer: { select: { email: true, name: true } },
      items: { select: { listingTitle: true, quantity: true, unitAmount: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.buyerId !== dbUser.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (order.status !== "SHIPPED") {
    return NextResponse.json({ error: "Order is not awaiting confirmation." }, { status: 409 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED" },
  });

  await prisma.notification.create({
    data: {
      userId: order.buyerId,
      type: "ORDER_DELIVERED",
      title: "Order completed",
      body: "Thanks for confirming receipt. Enjoy your purchase!",
      entityType: "order",
      entityId: orderId,
    },
  });

  await sendOrderDeliveredEmail({
    to: order.buyer.email,
    buyerName: order.buyer.name,
    orderId,
    items: order.items.map((i) => ({
      title: i.listingTitle,
      quantity: i.quantity,
      unitAmount: i.unitAmount,
      currency: order.currency,
    })),
    totalAmount: order.items.reduce((s, i) => s + i.unitAmount * i.quantity, 0),
    currency: order.currency,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  // Release the seller payout. Non-fatal if it fails, admin can retry via the
  // release route; the order is already DELIVERED.
  try {
    await releaseOrderPayout(orderId);
  } catch (err) {
    console.error(`[confirm-received] payout release failed for ${orderId}:`, err);
  }

  return NextResponse.json({ status: "DELIVERED" });
}
