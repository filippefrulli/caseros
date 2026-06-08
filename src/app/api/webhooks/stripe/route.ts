import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { Prisma } from "@/generated/prisma/client";
import { sendOrderConfirmedEmail, sendNewOrderEmail, sendAdminNewOrderEmail } from "@/lib/email";
import { track } from "@vercel/analytics/server";

// Webhook handlers need Node crypto for signature verification and must always
// run at request time — never cached, never prerendered, never on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body is mandatory for HMAC verification — do not parse JSON first.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe webhook] signature verification failed:", message);
    return NextResponse.json({ error: `Invalid signature: ${message}` }, { status: 400 });
  }

  // Check first whether we've already fully processed this event. The dedup row
  // is only written AFTER the handler succeeds (below), so a 500 from a handler
  // leaves no row and the retry runs again — that's what we want. Per-entity
  // status guards in M3+ handlers prevent concurrent double-processing of a
  // simultaneously-redelivered event.
  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const v1Account = event.data.object as Stripe.Account;
        if (v1Account.id) {
          await prisma.sellerProfile.updateMany({
            where: { stripeAccountId: v1Account.id },
            data: { payoutsEnabled: v1Account.payouts_enabled ?? false },
          });
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (!orderId || !paymentIntentId) break;

        // Snapshot the shipping address from Stripe Checkout onto the Order.
        // Idempotent: the WHERE guard (shippingLine1 IS NULL) means a retry won't
        // overwrite an existing snapshot from /api/checkout.
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, buyerId: true, shippingLine1: true },
        });

        const shippingDetails = session.collected_information?.shipping_details;
        const phone =
          (session as unknown as { customer_details?: { phone?: string | null } }).customer_details?.phone ?? null;
        if (order && !order.shippingLine1 && shippingDetails?.address) {
          const addr = shippingDetails.address;
          await prisma.order.update({
            where: { id: orderId },
            data: {
              stripePaymentIntentId: paymentIntentId,
              shippingName: shippingDetails.name ?? null,
              shippingLine1: addr.line1 ?? "",
              shippingLine2: addr.line2 ?? null,
              shippingCity: addr.city ?? "",
              shippingPostalCode: addr.postal_code ?? "",
              shippingCountry: addr.country ?? null,
              shippingPhone: phone,
            },
          });
        } else {
          // Link the Order to the PaymentIntent. payment_intent.succeeded does
          // the actual PAID transition; this just records the id.
          await prisma.order.updateMany({
            where: { id: orderId, stripePaymentIntentId: null },
            data: { stripePaymentIntentId: paymentIntentId },
          });
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        if (!orderId) {
          console.warn(`[stripe webhook] pi.succeeded ${pi.id} missing orderId metadata`);
          break;
        }

        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true, buyer: { select: { id: true, email: true, name: true } } },
        });
        if (!order) {
          console.warn(`[stripe webhook] pi.succeeded ${pi.id} references unknown order ${orderId}`);
          break;
        }
        // Idempotency guard — webhook may be redelivered or race with
        // checkout.session.completed. PENDING is the only valid start state.
        if (order.status !== "PENDING") break;

        const chargeId =
          typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;

        // Conditional stock decrement. If another buyer drained stock between
        // checkout creation and payment success, count comes back 0 and we
        // compensate by refunding immediately.
        const oversoldItems: { listingId: string; quantity: number }[] = [];
        for (const item of order.items) {
          if (!item.listingId) continue;
          const result = await prisma.listing.updateMany({
            where: { id: item.listingId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            oversoldItems.push({ listingId: item.listingId, quantity: item.quantity });
            continue;
          }
          // If that decrement zeroed stock, flip the listing to SOLD_OUT.
          await prisma.listing.updateMany({
            where: { id: item.listingId, stock: 0, status: "ACTIVE" },
            data: { status: "SOLD_OUT" },
          });
        }

        if (oversoldItems.length > 0) {
          // Race lost — buyer paid for stock that's gone. Refund immediately
          // and mark the order CANCELLED. charge.refunded webhook will not
          // re-process because status moves out of PENDING here.
          try {
            await stripe.refunds.create({ payment_intent: pi.id });
          } catch (refundErr) {
            console.error(
              `[stripe webhook] compensating refund failed for ${pi.id}:`,
              refundErr,
            );
          }
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              stripePaymentIntentId: pi.id,
              stripeChargeId: chargeId,
            },
          });
          await prisma.notification.create({
            data: {
              userId: order.buyerId,
              type: "ORDER_CANCELLED",
              title: "Order cancelled — out of stock",
              body: "Sorry — the item sold out before we could confirm your order. Your card has been refunded.",
              entityType: "order",
              entityId: order.id,
            },
          });
          break;
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PROCESSING",
            stripePaymentIntentId: pi.id,
            stripeChargeId: chargeId,
          },
        });

        track("purchase_completed", {
          currency: order.currency,
          amount: order.totalAmount,
        }).catch(() => {});

        // Notify buyer + each unique seller. M3 always has one item, but the
        // shape is forward-compatible with multi-item orders.
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_PLACED",
            title: "Order confirmed",
            body: "Thanks for your purchase. The seller has been notified.",
            entityType: "order",
            entityId: order.id,
          },
        });
        const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
        const sellerProfiles = await prisma.sellerProfile.findMany({
          where: { id: { in: sellerIds } },
          select: { userId: true, shopName: true, user: { select: { email: true } } },
        });
        if (sellerProfiles.length > 0) {
          await prisma.notification.createMany({
            data: sellerProfiles.map((s) => ({
              userId: s.userId,
              type: "ORDER_PLACED" as const,
              title: "New order received",
              body: "A buyer just purchased one of your listings.",
              entityType: "order",
              entityId: order.id,
            })),
          });
        }

        // Send transactional emails. Awaited so errors surface in webhook logs
        // (Stripe retries on 5xx). SDK never throws — errors are logged inside send().
        const emailItems = order.items.map((i) => ({
          title: i.listingTitle,
          quantity: i.quantity,
          unitAmount: i.unitAmount,
          currency: order.currency,
        }));
        await Promise.all([
          sendOrderConfirmedEmail({
            to: order.buyer.email,
            buyerName: order.buyer.name,
            orderId: order.id,
            items: emailItems,
            totalAmount: order.totalAmount,
            currency: order.currency,
            appUrl: env.NEXT_PUBLIC_APP_URL,
          }),
          ...sellerProfiles.map((s) =>
            sendNewOrderEmail({
              to: s.user.email,
              shopName: s.shopName,
              orderId: order.id,
              sellerId: s.userId,
              items: emailItems,
              appUrl: env.NEXT_PUBLIC_APP_URL,
            }),
          ),
          sendAdminNewOrderEmail({
            orderId: order.id,
            buyerEmail: order.buyer.email,
            items: emailItems,
            totalAmount: order.totalAmount,
            currency: order.currency,
            appUrl: env.NEXT_PUBLIC_APP_URL,
          }),
        ]);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        if (!orderId) break;
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, buyerId: true },
        });
        if (!order || order.status !== "PENDING") break;
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", stripePaymentIntentId: pi.id },
        });
        await prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_CANCELLED",
            title: "Payment failed",
            body: "Your payment could not be processed. No charge was made.",
            entityType: "order",
            entityId: order.id,
          },
        });
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!paymentIntentId) break;

        const order = await prisma.order.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
          include: { items: true },
        });
        if (!order) break;

        // Sum all refund amounts from this charge event.
        const totalRefunded = charge.refunds?.data?.reduce((sum, r) => sum + r.amount, 0) ?? 0;
        const isFullRefund = totalRefunded >= order.totalAmount;

        // Distribute refunded amount proportionally across items (MVP: one item per order).
        await Promise.all(
          order.items.map((item) => {
            const itemRefund = Math.min(totalRefunded, item.unitAmount * item.quantity);
            return prisma.orderItem.update({
              where: { id: item.id },
              data: { refundedAmount: itemRefund },
            });
          }),
        );

        if (isFullRefund && order.status !== "REFUNDED" && order.status !== "CANCELLED") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "REFUNDED" },
          });
          await prisma.notification.create({
            data: {
              userId: order.buyerId,
              type: "ORDER_REFUNDED",
              title: "Refund processed",
              body: "Your refund has been processed and will appear on your card within a few days.",
              entityType: "order",
              entityId: order.id,
            },
          });
        }
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

        // Always log — this is the primary alert in dev/staging.
        console.error(
          `[DISPUTE] id=${dispute.id} amount=${dispute.amount} reason=${dispute.reason} charge=${chargeId}`,
        );

        // Best-effort: find the affected order and notify the admin via the
        // in-app notification system. Fails silently if no matching order.
        try {
          const order = chargeId
            ? await prisma.order.findFirst({
                where: { stripeChargeId: chargeId },
                select: { id: true },
              })
            : null;

          const adminUser = await prisma.user.findUnique({
            where: { email: env.ADMIN_EMAIL },
            select: { id: true },
          });

          if (adminUser) {
            await prisma.notification.create({
              data: {
                userId: adminUser.id,
                type: "ORDER_REFUNDED",
                title: "Dispute opened",
                body: `Stripe dispute ${dispute.id} (${dispute.reason}, €${(dispute.amount / 100).toFixed(2)}) requires your attention.`,
                entityType: "order",
                entityId: order?.id ?? dispute.id,
              },
            });
          }
        } catch (notifyErr) {
          console.error("[stripe webhook] dispute notification failed:", notifyErr);
        }
        break;
      }
      default:
        console.log(`[stripe webhook] unhandled event ${event.type} (${event.id})`);
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    // No dedup row written → Stripe retry will re-run the handler.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    // Two concurrent deliveries raced — both ran the handler. Per-entity status
    // guards make that idempotent, so swallow the unique violation here.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  return NextResponse.json({ received: true });
}
