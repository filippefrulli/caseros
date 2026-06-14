import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getRates, isShippingConfigured } from "@/lib/shipping";
import { isIntegratedShippingEnabled } from "@/lib/platform-settings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Require auth, Shippo costs per request, so unauthenticated callers
  // could rack up bills or scrape pricing.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!(await isIntegratedShippingEnabled())) {
    return NextResponse.json({ error: "Shipping rates not available." }, { status: 503 });
  }

  if (!isShippingConfigured()) {
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
  // Chrome sometimes autofills the full formatted address ("Street 12, City, Country")
  // into the street field. Shippo only accepts the street portion, strip from first comma.
  const street1 = line1.split(",")[0].trim();

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
        street1,
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

    if (rates.length === 0) {
      console.warn("[shipping-rates] Shippo returned 0 rates. From:", s.pickupCity, s.pickupCountry, "→ To:", city, country, "Street:", street1, "Weight:", listing.weightGrams, "g");
    }

    return NextResponse.json({ rates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch rates.";
    console.error("[shipping-rates] Shippo error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
