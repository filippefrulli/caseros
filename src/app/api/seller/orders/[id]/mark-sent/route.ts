import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendOrderShippedEmail } from "@/lib/email";
import { env } from "@/env";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Self-managed shipping: the seller arranges delivery themselves, then marks the
// order as sent. No carrier label or tracking, just the status transition.
export async function POST(_req: Request, { params }: Params) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sellerProfile = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
    select: { id: true },
  });
  if (!sellerProfile) return NextResponse.json({ error: "Seller profile not found." }, { status: 403 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      buyer: { select: { id: true, email: true, name: true } },
      items: { select: { sellerId: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.items.every((i) => i.sellerId === sellerProfile.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (order.status !== "PROCESSING") {
    return NextResponse.json({ error: "Order is not in PROCESSING state." }, { status: 409 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "SHIPPED", shippedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: order.buyer.id,
      type: "ORDER_SHIPPED",
      title: "Your order has been sent",
      body: "The seller has sent your order. Confirm receipt once it arrives.",
      entityType: "order",
      entityId: orderId,
    },
  });

  await sendOrderShippedEmail({
    to: order.buyer.email,
    buyerName: order.buyer.name,
    orderId,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  return NextResponse.json({ status: "SHIPPED" });
}
