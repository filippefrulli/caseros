"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const listingSchema = z.object({
  categoryId: z.string().min(1, "Please select a category"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be 5000 characters or less"),
  priceEuros: z.coerce
    .number({ error: "Enter a valid price" })
    .positive("Price must be greater than 0")
    .max(10_000, "Price must be €10,000 or less"),
  stock: z.coerce
    .number({ error: "Enter a valid stock quantity" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .max(9_999),
  publishNow: z.string().optional(),
});

export type ListingActionState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "description" | "priceEuros" | "stock" | "categoryId", string[]>
  >;
} | null;

function toSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 44);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function createListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = listingSchema.safeParse({
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceEuros: formData.get("priceEuros"),
    stock: formData.get("stock"),
    publishNow: formData.get("publishNow") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { categoryId, title, description, priceEuros, stock, publishNow } = parsed.data;

  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);
  const videoUrl = formData.get("videoUrl")?.toString() || null;

  if (imageUrls.length === 0) {
    return { error: "Add at least one photo before saving." };
  }

  const seller = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
  });
  if (!seller) return { error: "Seller profile not found." };

  await prisma.listing.create({
    data: {
      sellerId: seller.id,
      categoryId,
      title,
      slug: toSlug(title),
      description,
      priceAmount: Math.round(priceEuros * 100),
      currency: seller.currency,
      stock,
      videoUrl,
      status: publishNow ? "ACTIVE" : "DRAFT",
      images: {
        create: imageUrls.map((url, position) => ({ url, position })),
      },
    },
  });

  redirect("/seller/dashboard");
}

export async function updateListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return { error: "Listing ID missing." };

  const parsed = listingSchema.safeParse({
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceEuros: formData.get("priceEuros"),
    stock: formData.get("stock"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { categoryId, title, description, priceEuros, stock } = parsed.data;

  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);
  const videoUrl = formData.get("videoUrl")?.toString() || null;

  if (imageUrls.length === 0) {
    return { error: "Add at least one photo before saving." };
  }

  const existing = await prisma.listing.findFirst({
    where: { id: listingId, seller: { user: { supabaseId: user.id } }, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { error: "Listing not found." };

  await prisma.$transaction(async (tx) => {
    await tx.listingImage.deleteMany({ where: { listingId } });
    await tx.listing.update({
      where: { id: listingId },
      data: {
        categoryId,
        title,
        description,
        priceAmount: Math.round(priceEuros * 100),
        stock,
        videoUrl,
        images: {
          create: imageUrls.map((url, position) => ({ url, position })),
        },
      },
    });
  });

  redirect("/seller/dashboard");
}
