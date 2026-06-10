import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendAdminSellerApplicationEmail } from "@/lib/email";
import { env } from "@/env";
import { track } from "@vercel/analytics/server";

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
    // Trader KYC
    businessRegNumber, contactPhone, contactEmail, safetyCompliant,
    // Shop
    shopName, slug, bio, country,
    // Pickup/shipping address
    pickupName, pickupLine1, pickupLine2, pickupCity, pickupPostalCode, pickupCountry, pickupPhone,
    // Verification
    verificationVideoUrl,
    // Social links
    website, instagram, tiktok, youtube, facebook,
  } = body;

  if (!sellerType || !shopName?.trim() || !slug?.trim() || !country) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (sellerType === "INDIVIDUAL") {
    if (!fullName?.trim() || !dateOfBirth || !addressLine1?.trim() || !city?.trim() || !postalCode?.trim()) {
      return NextResponse.json({ error: "Missing identity fields" }, { status: 400 });
    }
  }

  if (!pickupLine1?.trim() || !pickupCity?.trim() || !pickupPostalCode?.trim()) {
    return NextResponse.json({ error: "Shipping address is required" }, { status: 400 });
  }

  if (sellerType === "TRADER") {
    if (!businessRegNumber?.trim() || !contactPhone?.trim() || !contactEmail?.trim()) {
      return NextResponse.json({ error: "Missing business fields" }, { status: 400 });
    }
    if (!safetyCompliant) {
      return NextResponse.json({ error: "Safety compliance must be confirmed" }, { status: 400 });
    }
  }

  if (!verificationVideoUrl?.trim()) {
    return NextResponse.json({ error: "Verification video is required" }, { status: 400 });
  }

  const hasSocialLink = [website, instagram, tiktok, youtube, facebook].some((l: unknown) =>
    typeof l === "string" && l.trim(),
  );
  if (!hasSocialLink) {
    return NextResponse.json({ error: "At least one social media link is required" }, { status: 400 });
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
      pickupName: pickupName?.trim() || null,
      pickupLine1: pickupLine1.trim(),
      pickupLine2: pickupLine2?.trim() || null,
      pickupCity: pickupCity.trim(),
      pickupPostalCode: pickupPostalCode.trim(),
      pickupCountry: pickupCountry?.trim() || country,
      pickupPhone: pickupPhone?.trim() || null,
      kyc: {
        create: {
          sellerType,
          fullName: fullName?.trim() ?? null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          addressLine1: addressLine1?.trim() ?? null,
          addressLine2: addressLine2?.trim() ?? null,
          city: city?.trim() ?? null,
          postalCode: postalCode?.trim() ?? null,
          businessRegNumber: businessRegNumber?.trim() ?? null,
          contactPhone: contactPhone?.trim() ?? null,
          contactEmail: contactEmail?.trim() ?? null,
          safetyCompliant: safetyCompliant ?? false,
          verificationVideoUrl: verificationVideoUrl.trim(),
        },
      },
      socialLinks: {
        create: {
          website: website?.trim() || null,
          instagram: instagram?.trim() || null,
          tiktok: tiktok?.trim() || null,
          youtube: youtube?.trim() || null,
          facebook: facebook?.trim() || null,
        },
      },
    },
  });

  track("seller_registered", { sellerType }).catch(() => {});

  // Fire-and-forget — don't block the response on email delivery.
  sendAdminSellerApplicationEmail({
    shopName: shopNameClean,
    sellerType,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  }).catch((err) => console.error("[email] admin seller application email failed:", err));

  return NextResponse.json({ ok: true });
}
