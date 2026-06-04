import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getShipments } from "@/lib/shippo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sellerProfile = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
    select: { id: true },
  });
  if (!sellerProfile) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shippingTransactionId: true,
      labelDocumentLink: true,
      items: { select: { sellerId: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.items.every((i) => i.sellerId === sellerProfile.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!order.shippingTransactionId || !order.labelDocumentLink) {
    return NextResponse.json({ error: "No label available." }, { status: 404 });
  }

  // Shippo label URLs are stable signed S3 URLs — fetch directly.
  const pdfRes = await fetch(order.labelDocumentLink);
  if (!pdfRes.ok) {
    return NextResponse.json({ error: "Could not retrieve label — please try again later." }, { status: 502 });
  }

  const shortId = orderId.slice(-8).toUpperCase();
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="label-${shortId}.pdf"`,
  });

  return new NextResponse(pdfRes.body, { headers });
}
