import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShipments, isShippoConfigured } from "@/lib/shippo";
import { sendOrderDeliveredEmail } from "@/lib/email";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isShippoConfigured()) {
    return NextResponse.json({ error: "Shippo not configured." }, { status: 503 });
  }

  // Cap per-run. If a backlog of shipped orders builds up the cron will catch
  // up over consecutive days rather than risking the 10s function timeout in
  // one giant batch.
  const shippedOrders = await prisma.order.findMany({
    where: { status: "SHIPPED", shippingTransactionId: { not: null } },
    orderBy: { updatedAt: "asc" },
    take: 500,
    include: {
      buyer: { select: { id: true, email: true, name: true } },
      items: { select: { listingTitle: true, quantity: true, unitAmount: true } },
    },
  });

  if (shippedOrders.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Batch in chunks of 100 (Sendcloud limit).
  const BATCH = 100;
  let updated = 0;

  for (let i = 0; i < shippedOrders.length; i += BATCH) {
    const batch = shippedOrders.slice(i, i + BATCH);
    const uuids = batch.map((o) => o.shippingTransactionId!);

    let statuses;
    try {
      statuses = await getShipments(uuids);
    } catch (err) {
      console.error("[sync-tracking] getShipments error:", err);
      continue;
    }

    for (const status of statuses) {
      if (status.statusCode !== "DELIVERED") continue;

      const order = batch.find((o) => o.shippingTransactionId === status.id);
      if (!order) continue;

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED" },
      });

      await prisma.notification.create({
        data: {
          userId: order.buyer.id,
          type: "ORDER_DELIVERED",
          title: "Your order has been delivered",
          body: "Your parcel has been delivered. Enjoy!",
          entityType: "order",
          entityId: order.id,
        },
      });

      await sendOrderDeliveredEmail({
        to: order.buyer.email,
        buyerName: order.buyer.name,
        orderId: order.id,
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

      updated++;
    }
  }

  return NextResponse.json({ updated });
}
