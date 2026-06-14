import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/env";
import { TEST_EMAIL_KEYS } from "@/lib/test-emails";
import {
  sendOrderConfirmedEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendNewOrderEmail,
  sendPayoutReleasedEmail,
  sendAdminNewOrderEmail,
  sendAdminSellerApplicationEmail,
} from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({
  template: z.enum(TEST_EMAIL_KEYS),
  to: z.string().email(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { template, to } = parsed.data;

  // Sample data. A random suffix makes the Resend idempotency keys unique on
  // every test send, so the email is actually delivered each time instead of
  // being deduplicated as a repeat of an earlier order.
  const rid = crypto.randomUUID().slice(0, 8);
  const orderId = `test-${rid}`;
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const currency = "EUR";
  const items = [
    { title: "Hand-thrown ceramic mug", quantity: 2, unitAmount: 2500, currency },
    { title: "Linen tea towel", quantity: 1, unitAmount: 1800, currency },
  ];
  const totalAmount = 6800;

  try {
    switch (template) {
      case "order-confirmed":
        await sendOrderConfirmedEmail({ to, buyerName: "Alex Buyer", orderId, items, totalAmount, currency, appUrl });
        break;
      case "order-shipped":
        await sendOrderShippedEmail({
          to,
          buyerName: "Alex Buyer",
          orderId,
          trackingCode: "TEST123456789",
          trackingUrl: "https://tracking.example.com/TEST123456789",
          appUrl,
        });
        break;
      case "order-delivered":
        await sendOrderDeliveredEmail({ to, buyerName: "Alex Buyer", orderId, items, totalAmount, currency, appUrl });
        break;
      case "new-order":
        await sendNewOrderEmail({ to, shopName: "Test Shop", orderId, sellerId: `test-seller-${rid}`, items, appUrl });
        break;
      case "payout-released":
        await sendPayoutReleasedEmail({ to, shopName: "Test Shop", orderId, itemId: `test-item-${rid}`, payoutAmount: 5800, currency, appUrl });
        break;
      case "admin-new-order":
        await sendAdminNewOrderEmail({ orderId, buyerEmail: to, items, totalAmount, currency, appUrl });
        break;
      case "admin-seller-application":
        await sendAdminSellerApplicationEmail({ shopName: `Test Shop ${rid}`, sellerType: "Individual", appUrl });
        break;
    }
  } catch (err) {
    console.error("[admin/test-emails] send failed:", err);
    return NextResponse.json({ error: "Send failed, check server logs." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
