import { Resend } from "resend";
import { env } from "@/env";
import { OrderConfirmedEmail } from "@/emails/order-confirmed";
import { NewOrderEmail } from "@/emails/new-order";
import { PayoutReleasedEmail } from "@/emails/payout-released";
import { OrderDeliveredEmail } from "@/emails/order-delivered";
import { OrderShippedEmail } from "@/emails/order-shipped";
import { AdminSellerApplicationEmail } from "@/emails/admin-seller-application";
import { AdminNewOrderEmail } from "@/emails/admin-new-order";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Sandbox default — works without a verified domain, delivers only to the
// account owner's address. Override with RESEND_FROM once a domain is verified.
const FROM = env.RESEND_FROM ?? "caseros <onboarding@resend.dev>";

type OrderItem = {
  title: string;
  quantity: number;
  unitAmount: number;
  currency: string;
};

// The Resend SDK never throws — it returns { data, error }. This helper logs
// the error and returns so callers don't need to check the tuple themselves.
async function send(...args: Parameters<Resend["emails"]["send"]>) {
  const { data, error } = await resend!.emails.send(...args);
  if (error) {
    console.error("[email] Resend API error:", error.message, error);
  }
  return data;
}

export async function sendOrderConfirmedEmail({
  to,
  buyerName,
  orderId,
  items,
  totalAmount,
  currency,
  appUrl,
}: {
  to: string;
  buyerName: string | null;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping order confirmed email");
    return;
  }
  await send(
    {
      from: FROM,
      to,
      subject: "Your order is confirmed",
      react: OrderConfirmedEmail({ buyerName, orderId, items, totalAmount, currency, appUrl }),
    },
    { idempotencyKey: `order-confirmed/${orderId}` },
  );
}

export async function sendNewOrderEmail({
  to,
  shopName,
  orderId,
  sellerId,
  items,
  appUrl,
}: {
  to: string;
  shopName: string;
  orderId: string;
  sellerId: string;
  items: OrderItem[];
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping new order email");
    return;
  }
  await send(
    {
      from: FROM,
      to,
      subject: `New order in ${shopName}`,
      react: NewOrderEmail({ shopName, orderId, items, appUrl }),
    },
    { idempotencyKey: `new-order/${orderId}/${sellerId}` },
  );
}

export async function sendOrderShippedEmail({
  to,
  buyerName,
  orderId,
  trackingCode,
  trackingUrl,
  appUrl,
}: {
  to: string;
  buyerName: string | null;
  orderId: string;
  trackingCode: string;
  trackingUrl: string;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping order shipped email");
    return;
  }
  await send(
    {
      from: FROM,
      to,
      subject: `Your order #${orderId.slice(-8).toUpperCase()} is on its way`,
      react: OrderShippedEmail({ buyerName, orderId, trackingCode, trackingUrl, appUrl }),
    },
    { idempotencyKey: `order-shipped/${orderId}` },
  );
}

export async function sendOrderDeliveredEmail({
  to,
  buyerName,
  orderId,
  items,
  totalAmount,
  currency,
  appUrl,
}: {
  to: string;
  buyerName: string | null;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping order delivered email");
    return;
  }
  await send(
    {
      from: FROM,
      to,
      subject: `Your order #${orderId.slice(-8).toUpperCase()} has been delivered`,
      react: OrderDeliveredEmail({ buyerName, orderId, items, totalAmount, currency, appUrl }),
    },
    { idempotencyKey: `order-delivered/${orderId}` },
  );
}

export async function sendAdminSellerApplicationEmail({
  shopName,
  sellerType,
  appUrl,
}: {
  shopName: string;
  sellerType: string;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping admin seller application email");
    return;
  }
  if (!env.ADMIN_EMAIL) return;
  await send(
    {
      from: FROM,
      to: env.ADMIN_EMAIL,
      subject: `New seller application: ${shopName}`,
      react: AdminSellerApplicationEmail({ shopName, sellerType, appUrl }),
    },
    { idempotencyKey: `admin-seller-application/${shopName}` },
  );
}

export async function sendAdminNewOrderEmail({
  orderId,
  buyerEmail,
  items,
  totalAmount,
  currency,
  appUrl,
}: {
  orderId: string;
  buyerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping admin new order email");
    return;
  }
  if (!env.ADMIN_EMAIL) return;
  await send(
    {
      from: FROM,
      to: env.ADMIN_EMAIL,
      subject: `New order #${orderId.slice(-8).toUpperCase()}`,
      react: AdminNewOrderEmail({ orderId, buyerEmail, items, totalAmount, currency, appUrl }),
    },
    { idempotencyKey: `admin-new-order/${orderId}` },
  );
}

export async function sendPayoutReleasedEmail({
  to,
  shopName,
  orderId,
  itemId,
  payoutAmount,
  currency,
  appUrl,
}: {
  to: string;
  shopName: string;
  orderId: string;
  itemId: string;
  payoutAmount: number;
  currency: string;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping payout released email");
    return;
  }
  await send(
    {
      from: FROM,
      to,
      subject: `Your payout for order #${orderId.slice(-8).toUpperCase()} is on its way`,
      react: PayoutReleasedEmail({ shopName, orderId, payoutAmount, currency, appUrl }),
    },
    { idempotencyKey: `payout-released/${itemId}` },
  );
}
