import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { sendPayoutReleasedEmail } from "@/lib/email";

/**
 * Release the seller payout(s) for an order: create a Stripe transfer per item
 * to the seller's connected account, record it, and notify the seller.
 *
 * Idempotent — items that already have a `stripeTransferId` are skipped, so this
 * is safe to call from the admin release route, the buyer's confirm-received
 * action, and the auto-release cron without double-paying.
 *
 * The caller is responsible for ensuring the order is in a releasable state
 * (DELIVERED). Returns the number of transfers created.
 */
export async function releaseOrderPayout(orderId: string): Promise<number> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error(`releaseOrderPayout: order ${orderId} not found`);
  if (!order.stripeChargeId) {
    throw new Error(`releaseOrderPayout: order ${orderId} has no charge id`);
  }

  const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
  const sellerProfiles = await prisma.sellerProfile.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, userId: true, shopName: true, user: { select: { email: true } } },
  });
  const sellerProfileMap = new Map(sellerProfiles.map((s) => [s.id, s]));

  const releasedAt = new Date();
  let released = 0;

  await Promise.all(
    order.items.map(async (item) => {
      if (item.stripeTransferId) return; // already released
      if (!item.sellerStripeAccountId) {
        console.warn(`[payouts] item ${item.id} has no sellerStripeAccountId — skipping`);
        return;
      }

      const transfer = await stripe.transfers.create({
        amount: item.sellerPayout,
        currency: order.currency.toLowerCase(),
        destination: item.sellerStripeAccountId,
        source_transaction: order.stripeChargeId!,
        transfer_group: order.id,
      });

      await prisma.orderItem.update({
        where: { id: item.id },
        data: { stripeTransferId: transfer.id, payoutReleasedAt: releasedAt },
      });
      released++;

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
          currency: order.currency,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        });
      }
    }),
  );

  return released;
}
