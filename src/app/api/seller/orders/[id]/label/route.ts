import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createShipment, isShippoConfigured } from "@/lib/shippo";
import { sendOrderShippedEmail } from "@/lib/email";
import { env } from "@/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  weightGrams: z.coerce.number().int().positive().max(999_000),
  lengthCm: z.coerce.number().int().positive().max(999).optional().nullable(),
  widthCm: z.coerce.number().int().positive().max(999).optional().nullable(),
  heightCm: z.coerce.number().int().positive().max(999).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id: orderId } = await params;

  if (!isShippoConfigured()) {
    return NextResponse.json({ error: "Shipping not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }
  const { weightGrams, lengthCm, widthCm, heightCm } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shippingAddress: true,
      buyer: { select: { id: true, email: true, name: true } },
      items: {
        select: {
          sellerId: true,
          listingTitle: true,
          quantity: true,
          unitAmount: true,
          currency: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "PROCESSING") {
    return NextResponse.json({ error: "Order is not in PROCESSING state." }, { status: 409 });
  }
  if (order.shippingTransactionId) {
    return NextResponse.json({ error: "Label already generated." }, { status: 409 });
  }

  const sellerProfile = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
    select: {
      id: true,
      pickupName: true,
      pickupLine1: true,
      pickupLine2: true,
      pickupHouseNumber: true,
      pickupCity: true,
      pickupPostalCode: true,
      pickupCountry: true,
      pickupPhone: true,
      user: { select: { email: true } },
    },
  });

  if (!sellerProfile) return NextResponse.json({ error: "Seller profile not found." }, { status: 403 });
  if (!order.items.every((i) => i.sellerId === sellerProfile.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!sellerProfile.pickupLine1 || !sellerProfile.pickupCity || !sellerProfile.pickupPostalCode || !sellerProfile.pickupCountry || !sellerProfile.pickupPhone) {
    return NextResponse.json({ error: "Complete your pickup address in your profile before generating a label." }, { status: 409 });
  }

  if (!order.shippingAddress) {
    return NextResponse.json({ error: "Order has no shipping address." }, { status: 409 });
  }

  let shipment: Awaited<ReturnType<typeof createShipment>>;
  try {
    shipment = await createShipment({
      orderNumber: order.id,
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
      fromAddress: {
        name: sellerProfile.pickupName ?? sellerProfile.user.email,
        street1: sellerProfile.pickupLine1,
        street_no: sellerProfile.pickupHouseNumber ?? undefined,
        city: sellerProfile.pickupCity,
        zip: sellerProfile.pickupPostalCode,
        country: sellerProfile.pickupCountry,
        phone: sellerProfile.pickupPhone,
        email: sellerProfile.user.email,
      },
      toAddress: {
        name: order.shippingName ?? order.buyer.email,
        street1: order.shippingAddress.line1,
        street_no: order.shippingAddress.houseNumber ?? undefined,
        city: order.shippingAddress.city,
        zip: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
        phone: order.shippingAddress.phone ?? undefined,
        email: order.shippingAddress.email ?? order.buyer.email,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Shippo error.";
    return NextResponse.json({ error: `Label generation failed: ${message}` }, { status: 502 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "SHIPPED",
      shippingTransactionId: shipment.id,
      trackingCode: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      labelDocumentLink: shipment.labelDocumentLink,
    },
  });

  await prisma.notification.create({
    data: {
      userId: order.buyer.id,
      type: "ORDER_SHIPPED",
      title: "Your order has been shipped",
      body: `Tracking number: ${shipment.trackingNumber}`,
      entityType: "order",
      entityId: orderId,
    },
  });

  await sendOrderShippedEmail({
    to: order.buyer.email,
    buyerName: order.buyer.name,
    orderId,
    trackingCode: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  return NextResponse.json({ trackingCode: shipment.trackingNumber, trackingUrl: shipment.trackingUrl });
}
