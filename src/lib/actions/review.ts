"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  sellerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional().nullable(),
});

export type ReviewState = { error?: string; success?: boolean } | null;

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to leave a review." };

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return { error: "Account not found." };

  const parsed = schema.safeParse({
    sellerId: formData.get("sellerId"),
    rating: Number(formData.get("rating")),
    body: (formData.get("body") as string) || null,
  });
  if (!parsed.success) return { error: "Invalid review data." };
  const { sellerId, rating, body } = parsed.data;

  // Find a completed, unreviewed order from this buyer that contains items from this seller
  const eligibleOrder = await prisma.order.findFirst({
    where: {
      buyerId: dbUser.id,
      status: { in: ["SHIPPED", "DELIVERED"] },
      items: { some: { sellerId } },
      review: null,
    },
    select: { id: true },
  });

  if (!eligibleOrder) {
    return { error: "You can only review sellers from whom you have a completed order." };
  }

  await prisma.review.create({
    data: {
      orderId: eligibleOrder.id,
      sellerId,
      authorId: dbUser.id,
      rating,
      body: body?.trim() || null,
    },
  });

  return { success: true };
}
