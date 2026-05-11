import { stripe } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "PAID" },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "CANCELLED" },
      });
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.details_submitted) {
        await prisma.sellerProfile.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeOnboardingDone: true, status: "ACTIVE" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// Stripe webhooks require the raw body — disable body parsing
export const dynamic = "force-dynamic";
