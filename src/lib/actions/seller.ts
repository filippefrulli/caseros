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
    redirect("/dashboard");
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

  redirect("/dashboard");
}
