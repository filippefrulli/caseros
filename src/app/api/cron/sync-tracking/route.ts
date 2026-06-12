import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShipmentStatuses } from "@/lib/shipping";
import { isIntegratedShippingEnabled } from "@/lib/platform-settings";
import { sendOrderDeliveredEmail } from "@/lib/email";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // No carrier tracking to sync in self-managed shipping mode.
  if (!(await isIntegratedShippingEnabled())) {
    return NextResponse.json({ updated: 0 });
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

  // Group by the provider that created each label so we poll the right API.
  // Orders predating the shippingProvider column default to Shippo.
  const groups: Record<string, typeof shippedOrders> = {};
  for (const order of shippedOrders) {
    const provider = order.shippingProvider === "sendcloud" ? "sendcloud" : "shippo";
    (groups[provider] ??= []).push(order);
  }

  // Batch in chunks to avoid hammering the API in one shot.
  const BATCH = 100;
  let updated = 0;

  for (const [provider, orders] of Object.entries(groups)) {
    for (let i = 0; i < orders.length; i += BATCH) {
      const batch = orders.slice(i, i + BATCH);
      const ids = batch.map((o) => o.shippingTransactionId!);

      let statuses;
      try {
        statuses = await getShipmentStatuses(provider, ids);
      } catch (err) {
        console.error(`[sync-tracking] ${provider} status error:`, err);
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
  }

  return NextResponse.json({ updated });
}
