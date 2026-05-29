import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";

export const runtime = "nodejs";

type AllowedCountry = NonNullable<
  Stripe.Checkout.SessionCreateParams["shipping_address_collection"]
>["allowed_countries"][number];

const bodySchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10),
});

// EU27 + UK/CH/NO. Stripe Checkout's address collection is restricted to this list.
const ALLOWED_SHIPPING_COUNTRIES: AllowedCountry[] = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "GB", "CH", "NO",
];

export async function POST(req: Request) {
  try {
    return await handleCheckout(req);
  } catch (err) {
    console.error("[checkout] unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCheckout(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to buy." }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { listingId, quantity } = parsed.data;

  if (!user.email) {
    return NextResponse.json(
      { error: "Your account is missing an email. Please re-sign in." },
      { status: 400 },
    );
  }

  // Lazy upsert: some auth paths (e.g. magic links, older sign-ups) may not have
  // populated our users table, but the Supabase session is still valid.
  const [dbUser, listing] = await Promise.all([
    prisma.user.upsert({
      where: { supabaseId: user.id },
      create: {
        supabaseId: user.id,
        email: user.email,
        name: (user.user_metadata?.full_name as string) ?? null,
        avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
      },
      update: {},
    }),
    prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            id: true,
            stripeAccountId: true,
            stripeOnboardingDone: true,
            payoutsEnabled: true,
            commissionRate: true,
            userId: true,
          },
        },
      },
    }),
  ]);
  if (!listing || listing.deletedAt || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Listing not available." }, { status: 404 });
  }
  if (listing.seller.userId === dbUser.id) {
    return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });
  }
  if (listing.stock < quantity) {
    return NextResponse.json({ error: "Not enough stock." }, { status: 409 });
  }
  if (
    !listing.seller.stripeOnboardingDone ||
    !listing.seller.payoutsEnabled ||
    !listing.seller.stripeAccountId
  ) {
    return NextResponse.json(
      { error: "Seller is not ready to accept payments." },
      { status: 409 },
    );
  }

  const unitAmount = listing.priceAmount;
  const totalAmount = unitAmount * quantity;
  // commissionRate is Decimal(5,4). Fall back to 5% if missing or unparseable.
  const rawRate = listing.seller.commissionRate;
  const commissionRate =
    rawRate && Number.isFinite(Number(rawRate)) ? Number(rawRate) : 0.05;
  const sellerPayout = Math.floor(totalAmount * (1 - commissionRate));

  // Create PENDING order first so we have an id to thread through Stripe metadata
  // and transfer_group. The Checkout Session id is filled in below.
  const order = await prisma.order.create({
    data: {
      buyerId: dbUser.id,
      status: "PENDING",
      totalAmount,
      currency: listing.currency,
      items: {
        create: {
          listingId: listing.id,
          listingTitle: listing.title,
          sellerId: listing.seller.id,
          sellerStripeAccountId: listing.seller.stripeAccountId,
          quantity,
          unitAmount,
          currency: listing.currency,
          sellerPayout,
        },
      },
    },
  });

  // Charges land on the platform account (no transfer_data, no on_behalf_of).
  // transfer_group lets us find/link the later seller transfer in the Dashboard.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/account/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/listings/${listing.slug}`,
    customer_email: user.email,
    line_items: [
      {
        quantity,
        price_data: {
          currency: listing.currency.toLowerCase(),
          unit_amount: unitAmount,
          product_data: {
            name: listing.title,
          },
        },
      },
    ],
    shipping_address_collection: {
      allowed_countries: ALLOWED_SHIPPING_COUNTRIES,
    },
    payment_intent_data: {
      transfer_group: order.id,
      metadata: { orderId: order.id },
    },
    metadata: { orderId: order.id },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      checkoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  return NextResponse.json({ url: session.url });
}
