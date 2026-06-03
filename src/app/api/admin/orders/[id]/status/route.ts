import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import type { OrderStatus } from "@/generated/prisma/client";
import { sendOrderDeliveredEmail } from "@/lib/email";

export const runtime = "nodejs";

const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      currency: true,
      buyer: { select: { email: true, name: true } },
      items: { select: { listingTitle: true, quantity: true, unitAmount: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = TRANSITIONS[order.status];
  if (!next) {
    return NextResponse.json({ error: `Cannot advance from ${order.status}` }, { status: 409 });
  }

  await prisma.order.update({ where: { id }, data: { status: next } });

  if (next === "DELIVERED") {
    sendOrderDeliveredEmail({
      to: order.buyer.email,
      buyerName: order.buyer.name,
      orderId: order.id,
      items: order.items.map((i) => ({
        title: i.listingTitle,
        quantity: i.quantity,
        unitAmount: i.unitAmount,
        currency: order.currency,
      })),
      totalAmount: order.totalAmount,
      currency: order.currency,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }).catch((e) => console.error("[email] order delivered failed:", e));
  }

  return NextResponse.json({ status: next });
}
