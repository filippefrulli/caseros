import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { getRates, isShippoConfigured } from "@/lib/shippo";

export const runtime = "nodejs";

const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  houseNumber: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2),
  phone: z.string().nullable().optional(),
});

const shippingRateSchema = z.object({
  amount: z.number().int().min(0),
  displayName: z.string().min(1),
});

const bodySchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10),
  // Physical listings: either a saved addressId OR inline address fields
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  shippingRate: shippingRateSchema.optional(),
});

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to buy." }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { listingId, quantity, addressId, address: inlineAddress, shippingRate } = parsed.data;

  if (!user.email) {
    return NextResponse.json({ error: "Your account is missing an email. Please re-sign in." }, { status: 400 });
  }

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
            pickupName: true,
            pickupLine1: true,
            pickupHouseNumber: true,
            pickupCity: true,
            pickupPostalCode: true,
            pickupCountry: true,
            pickupPhone: true,
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
  if (!listing.seller.stripeOnboardingDone || !listing.seller.payoutsEnabled || !listing.seller.stripeAccountId) {
    return NextResponse.json({ error: "Seller is not ready to accept payments." }, { status: 409 });
  }

  const unitAmount = listing.priceAmount;
  const itemsTotal = unitAmount * quantity;

  // Resolve the shipping address: either from a saved address (addressId) or inline fields.
  // Re-fetch shipping rates server-side to verify the chosen rate is real — never trust
  // the amount from the client.
  let address: z.infer<typeof addressSchema> | null = null;
  let shouldSaveAddress = false;
  let shippingTotal = 0;
  let matchedRate: Awaited<ReturnType<typeof getRates>>[number] | undefined;

  if (!listing.isDigital) {
    if (!shippingRate) {
      return NextResponse.json({ error: "Shipping rate is required." }, { status: 400 });
    }

    if (addressId) {
      const saved = await prisma.address.findFirst({
        where: { id: addressId, userId: dbUser.id },
        select: { name: true, line1: true, houseNumber: true, line2: true, city: true, postalCode: true, country: true, phone: true },
      });
      if (!saved) {
        return NextResponse.json({ error: "Address not found." }, { status: 400 });
      }
      address = { ...saved, name: saved.name ?? "" };
      shouldSaveAddress = false;
    } else if (inlineAddress) {
      address = inlineAddress;
      shouldSaveAddress = true;
    } else {
      return NextResponse.json({ error: "Shipping address is required." }, { status: 400 });
    }

    if (!isShippoConfigured()) {
      return NextResponse.json({ error: "Shipping not configured." }, { status: 503 });
    }
    const s = listing.seller;
    if (!s.pickupLine1 || !s.pickupCity || !s.pickupPostalCode || !s.pickupCountry || !listing.weightGrams) {
      return NextResponse.json({ error: "Seller is not ready to ship this listing." }, { status: 409 });
    }
    // At this point address is guaranteed non-null (early returns cover all null cases above)
    const resolvedAddress = address!;
    let rates: Awaited<ReturnType<typeof getRates>>;
    try {
      rates = await getRates({
        fromAddress: {
          name: s.pickupName ?? "Seller",
          street1: s.pickupLine1,
          street_no: s.pickupHouseNumber ?? undefined,
          city: s.pickupCity,
          zip: s.pickupPostalCode,
          country: s.pickupCountry,
          phone: s.pickupPhone ?? undefined,
        },
        toAddress: {
          name: resolvedAddress.name,
          street1: resolvedAddress.line1.split(",")[0].trim(),
          street_no: resolvedAddress.houseNumber ?? undefined,
          city: resolvedAddress.city,
          zip: resolvedAddress.postalCode,
          country: resolvedAddress.country,
        },
        weightGrams: listing.weightGrams,
        lengthCm: listing.lengthCm,
        widthCm: listing.widthCm,
        heightCm: listing.heightCm,
      });
    } catch (err) {
      console.error("[checkout] rate verification failed:", err);
      return NextResponse.json({ error: "Could not verify shipping rate." }, { status: 502 });
    }
    const matched = rates.find(
      (r) => Math.round(parseFloat(r.amount) * 100) === shippingRate.amount,
    );
    if (!matched) {
      return NextResponse.json({ error: "Selected shipping rate is no longer available." }, { status: 409 });
    }
    shippingTotal = shippingRate.amount;
    matchedRate = matched;
  }

  const totalAmount = itemsTotal + shippingTotal;

  const rawRate = listing.seller.commissionRate;
  const commissionRate = rawRate && Number.isFinite(Number(rawRate)) ? Number(rawRate) : 0.05;
  // Commission on item subtotal only; shipping is passed through to cover carrier cost.
  const sellerPayout = Math.floor(itemsTotal * (1 - commissionRate));

  // For new inline addresses, save as the buyer's new default.
  // For addressId, the address is already in the book — no change.
  if (shouldSaveAddress && address) {
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId: dbUser.id, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.create({
        data: {
          userId: dbUser.id,
          name: address.name,
          line1: address.line1,
          houseNumber: address.houseNumber ?? null,
          line2: address.line2 ?? null,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone ?? null,
          isDefault: true,
        },
      }),
    ]);
  }

  const order = await prisma.order.create({
    data: {
      buyerId: dbUser.id,
      status: "PENDING",
      totalAmount,
      shippingAmount: shippingTotal,
      currency: listing.currency,
      ...(address
        ? {
            shippingName: address.name,
            shippingLine1: address.line1,
            shippingLine2: address.line2 ?? null,
            shippingHouseNumber: address.houseNumber ?? null,
            shippingCity: address.city,
            shippingPostalCode: address.postalCode,
            shippingCountry: address.country,
            shippingPhone: address.phone ?? null,
          }
        : {}),
      ...(matchedRate
        ? {
            shippingServiceProvider: matchedRate.provider,
            shippingServiceLevel: matchedRate.servicelevel,
          }
        : {}),
      items: {
        create: {
          listingId: listing.id,
          listingTitle: listing.title,
          sellerId: listing.seller.id,
          sellerStripeAccountId: listing.seller.stripeAccountId,
          quantity,
          unitAmount,
          sellerPayout,
        },
      },
    },
  });

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
          product_data: { name: listing.title },
        },
      },
    ],
    ...(shippingTotal > 0 && shippingRate
      ? {
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount" as const,
                fixed_amount: { amount: shippingTotal, currency: listing.currency.toLowerCase() },
                display_name: shippingRate.displayName,
              },
            },
          ],
        }
      : {}),
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
