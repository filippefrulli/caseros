import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRates, isShippoConfigured } from "@/lib/shippo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isShippoConfigured()) {
    return NextResponse.json({ error: "Shipping not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  const line1 = searchParams.get("line1");
  const city = searchParams.get("city");
  const postalCode = searchParams.get("postalCode");
  const country = searchParams.get("country");

  if (!listingId || !line1 || !city || !postalCode || !country) {
    return NextResponse.json({ error: "Missing required params." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null, status: "ACTIVE" },
    select: {
      isDigital: true,
      weightGrams: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      seller: {
        select: {
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
  });

  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.isDigital) return NextResponse.json({ rates: [] });

  const s = listing.seller;
  if (!s.pickupLine1 || !s.pickupCity || !s.pickupPostalCode || !s.pickupCountry) {
    return NextResponse.json({ error: "Seller has not configured their shipping address yet." }, { status: 422 });
  }

  if (!listing.weightGrams) {
    return NextResponse.json({ error: "Listing is missing weight information." }, { status: 422 });
  }

  const houseNumber = searchParams.get("houseNumber") ?? undefined;

  try {
    const rates = await getRates({
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
        name: "Buyer",
        street1: line1,
        street_no: houseNumber,
        city,
        zip: postalCode,
        country,
      },
      weightGrams: listing.weightGrams,
      lengthCm: listing.lengthCm,
      widthCm: listing.widthCm,
      heightCm: listing.heightCm,
    });
    return NextResponse.json({ rates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch rates.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
