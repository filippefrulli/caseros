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
  linkedin: urlOrEmpty.optional(),
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
    linkedin: (formData.get("linkedin") as string) || "",
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
        linkedin: nullIfEmpty(links.linkedin),
      },
      update: {
        website: nullIfEmpty(links.website),
        instagram: nullIfEmpty(links.instagram),
        tiktok: nullIfEmpty(links.tiktok),
        youtube: nullIfEmpty(links.youtube),
        facebook: nullIfEmpty(links.facebook),
        twitter: nullIfEmpty(links.twitter),
        pinterest: nullIfEmpty(links.pinterest),
        linkedin: nullIfEmpty(links.linkedin),
      },
    }),
  ]);

  return { success: true };
}
