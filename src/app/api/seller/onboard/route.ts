import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.upsert({
    where: { email: user.email! },
    create: {
      supabaseId: user.id,
      email: user.email!,
      name: (user.user_metadata?.full_name as string) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    },
    update: { supabaseId: user.id },
    include: { seller: true },
  });
  if (dbUser.seller) return NextResponse.json({ error: "Already a seller" }, { status: 409 });

  const body = await request.json();
  const {
    sellerType,
    // Individual KYC
    fullName, dateOfBirth, addressLine1, addressLine2, city, postalCode,
    disclaimerAcknowledged,
    // Trader KYC
    businessRegNumber, contactPhone, contactEmail, safetyCompliant,
    // Shop
    shopName, slug, bio, country,
  } = body;

  if (!sellerType || !shopName?.trim() || !slug?.trim() || !country) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (sellerType === "INDIVIDUAL") {
    if (!fullName?.trim() || !dateOfBirth || !addressLine1?.trim() || !city?.trim() || !postalCode?.trim()) {
      return NextResponse.json({ error: "Missing identity fields" }, { status: 400 });
    }
    if (!disclaimerAcknowledged) {
      return NextResponse.json({ error: "Disclaimer must be acknowledged" }, { status: 400 });
    }
  }

  if (sellerType === "TRADER") {
    if (!businessRegNumber?.trim() || !contactPhone?.trim() || !contactEmail?.trim()) {
      return NextResponse.json({ error: "Missing business fields" }, { status: 400 });
    }
    if (!safetyCompliant) {
      return NextResponse.json({ error: "Safety compliance must be confirmed" }, { status: 400 });
    }
  }

  const slugClean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
  const shopNameClean = shopName.trim();

  const [slugTaken, nameTaken] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { slug: slugClean } }),
    prisma.sellerProfile.findUnique({ where: { shopName: shopNameClean } }),
  ]);

  if (slugTaken) return NextResponse.json({ error: "This shop URL is already taken." }, { status: 409 });
  if (nameTaken) return NextResponse.json({ error: "This shop name is already taken." }, { status: 409 });

  await prisma.sellerProfile.create({
    data: {
      userId: dbUser.id,
      shopName: shopNameClean,
      slug: slugClean,
      bio: bio?.trim() || null,
      country,
      status: "PENDING",
      kyc: {
        create: {
          sellerType,
          fullName: fullName?.trim() ?? null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          addressLine1: addressLine1?.trim() ?? null,
          addressLine2: addressLine2?.trim() ?? null,
          city: city?.trim() ?? null,
          postalCode: postalCode?.trim() ?? null,
          disclaimerAcknowledged: disclaimerAcknowledged ?? false,
          businessRegNumber: businessRegNumber?.trim() ?? null,
          contactPhone: contactPhone?.trim() ?? null,
          contactEmail: contactEmail?.trim() ?? null,
          safetyCompliant: safetyCompliant ?? false,
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
