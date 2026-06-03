"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { env } from "@/env";

// Only accept avatar URLs that point at our own Supabase Storage `avatars`
// bucket. Without this, a user could set their avatar to an attacker-controlled
// URL — every page that renders the avatar would then leak referers to (and
// pull bandwidth from) that URL.
const AVATAR_URL_PREFIX = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/avatars/`;

export async function toggleFavorite(listingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) throw new Error("User not found");

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: dbUser.id, listingId } },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: { userId_listingId: { userId: dbUser.id, listingId } },
    });
  } else {
    await prisma.favorite.create({
      data: { userId: dbUser.id, listingId },
    });
  }

  revalidatePath("/account/favourites");
}

export async function updateUserAvatar(avatarUrl: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!avatarUrl.startsWith(AVATAR_URL_PREFIX) || avatarUrl.length > 500) {
    throw new Error("Invalid avatar URL");
  }

  await prisma.user.update({
    where: { supabaseId: user.id },
    data: { avatarUrl },
  });

  revalidatePath("/account");
}
