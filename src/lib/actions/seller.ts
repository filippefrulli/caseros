"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const onboardingSchema = z.object({
  shopName: z.string().min(3, "Shop name must be at least 3 characters").max(50, "Shop name must be 50 characters or less"),
  slug: z
    .string()
    .min(3, "URL must be at least 3 characters")
    .max(50, "URL must be 50 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  country: z.string().length(2, "Please select a country"),
});

export type OnboardingState = {
  error?: string;
  fieldErrors?: Partial<Record<"shopName" | "slug" | "bio" | "country", string[]>>;
} | null;

export async function createSellerProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const raw = {
    shopName: formData.get("shopName"),
    slug: formData.get("slug"),
    bio: formData.get("bio") || undefined,
    country: formData.get("country"),
  };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { shopName, slug, bio, country } = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { seller: true },
  });
  if (!dbUser) return { error: "User not found. Please sign out and sign in again." };

  if (dbUser.seller) {
    redirect("/seller/dashboard");
  }

  const slugTaken = await prisma.sellerProfile.findUnique({ where: { slug } });
  if (slugTaken) {
    return { fieldErrors: { slug: ["This URL is already taken. Please choose another."] } };
  }

  const shopNameTaken = await prisma.sellerProfile.findUnique({ where: { shopName } });
  if (shopNameTaken) {
    return { fieldErrors: { shopName: ["This shop name is already taken."] } };
  }

  await prisma.sellerProfile.create({
    data: {
      userId: dbUser.id,
      shopName,
      slug,
      bio,
      country,
    },
  });

  redirect("/seller/dashboard");
}

// ─── Update seller profile (bio + social links) ───────────────────────────────

const urlOrEmpty = z.union([z.literal(""), z.string().url("Must be a valid URL")]);

const profileSchema = z.object({
  bio: z.string().max(2000, "Bio must be 2000 characters or less").optional(),
  website: urlOrEmpty.optional(),
  instagram: urlOrEmpty.optional(),
  tiktok: urlOrEmpty.optional(),
  youtube: urlOrEmpty.optional(),
  facebook: urlOrEmpty.optional(),
  twitter: urlOrEmpty.optional(),
  pinterest: urlOrEmpty.optional(),
});

export type ProfileState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof profileSchema>, string[]>>;
} | null;

export async function updateSellerProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const seller = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
  });
  if (!seller) return { error: "Seller profile not found." };

  const raw = {
    bio: (formData.get("bio") as string) || undefined,
    website: (formData.get("website") as string) || "",
    instagram: (formData.get("instagram") as string) || "",
    tiktok: (formData.get("tiktok") as string) || "",
    youtube: (formData.get("youtube") as string) || "",
    facebook: (formData.get("facebook") as string) || "",
    twitter: (formData.get("twitter") as string) || "",
    pinterest: (formData.get("pinterest") as string) || "",
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { bio, ...links } = parsed.data;

  const nullIfEmpty = (v: string | undefined) => (v?.trim() || null);

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { bio: bio?.trim() || null },
    }),
    prisma.sellerSocialLinks.upsert({
      where: { sellerId: seller.id },
      create: {
        sellerId: seller.id,
        website: nullIfEmpty(links.website),
        instagram: nullIfEmpty(links.instagram),
        tiktok: nullIfEmpty(links.tiktok),
        youtube: nullIfEmpty(links.youtube),
        facebook: nullIfEmpty(links.facebook),
        twitter: nullIfEmpty(links.twitter),
        pinterest: nullIfEmpty(links.pinterest),
      },
      update: {
        website: nullIfEmpty(links.website),
        instagram: nullIfEmpty(links.instagram),
        tiktok: nullIfEmpty(links.tiktok),
        youtube: nullIfEmpty(links.youtube),
        facebook: nullIfEmpty(links.facebook),
        twitter: nullIfEmpty(links.twitter),
        pinterest: nullIfEmpty(links.pinterest),
      },
    }),
  ]);

  return { success: true };
}

// ─── Update seller pickup address ─────────────────────────────────────────────

const pickupSchema = z.object({
  pickupName: z.string().min(1, "Name is required").max(100),
  pickupLine1: z.string().min(1, "Street address is required").max(200),
  pickupLine2: z.string().max(200).optional(),
  pickupCity: z.string().min(1, "City is required").max(100),
  pickupPostalCode: z.string().min(1, "Postal code is required").max(20),
  pickupCountry: z.string().length(2, "Select a country"),
  pickupPhone: z.string().max(30).optional(),
});

export type PickupAddressState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof pickupSchema>, string[]>>;
  data?: z.infer<typeof pickupSchema>;
} | null;

export async function updatePickupAddress(
  _prev: PickupAddressState,
  formData: FormData,
): Promise<PickupAddressState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const seller = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
  });
  if (!seller) return { error: "Seller profile not found." };

  const raw = {
    pickupName: formData.get("pickupName") as string,
    pickupLine1: formData.get("pickupLine1") as string,
    pickupLine2: (formData.get("pickupLine2") as string) || undefined,
    pickupCity: formData.get("pickupCity") as string,
    pickupPostalCode: formData.get("pickupPostalCode") as string,
    pickupCountry: formData.get("pickupCountry") as string,
    pickupPhone: (formData.get("pickupPhone") as string) || undefined,
  };

  const parsed = pickupSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const saved = {
    pickupName: parsed.data.pickupName.trim(),
    pickupLine1: parsed.data.pickupLine1.trim(),
    pickupLine2: parsed.data.pickupLine2?.trim() || undefined,
    pickupCity: parsed.data.pickupCity.trim(),
    pickupPostalCode: parsed.data.pickupPostalCode.trim(),
    pickupCountry: parsed.data.pickupCountry,
    pickupPhone: parsed.data.pickupPhone?.trim() || undefined,
  };

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: {
      ...saved,
      pickupLine2: saved.pickupLine2 ?? null,
      pickupHouseNumber: null,
      pickupPhone: saved.pickupPhone ?? null,
    },
  });

  return { success: true, data: saved };
}

// ─── Ships-to countries ─────────────────────────────────────────────────────

const shipsToSchema = z.object({
  countries: z
    .array(z.string().length(2))
    .min(1, "Select at least one country you ship to")
    .max(50),
});

export type ShipsToState = { success?: boolean; error?: string; data?: string[] } | null;

export async function updateShipsToCountries(
  _prev: ShipsToState,
  formData: FormData,
): Promise<ShipsToState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const seller = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
    select: { id: true },
  });
  if (!seller) return { error: "Seller profile not found." };

  const parsed = shipsToSchema.safeParse({
    countries: formData.getAll("countries").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.countries?.[0] ?? "Invalid selection." };
  }

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: { shipsToCountries: parsed.data.countries },
  });

  return { success: true, data: parsed.data.countries };
}
