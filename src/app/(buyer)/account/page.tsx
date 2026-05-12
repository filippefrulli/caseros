import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AvatarUploader } from "@/components/seller/avatar-uploader";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      _count: { select: { orders: true, favorites: true } },
    },
  });

  const name = (user.user_metadata?.full_name as string) ?? dbUser?.name ?? "Anonymous";
  const email = user.email ?? dbUser?.email ?? "";
  const orderCount = dbUser?._count?.orders ?? 0;
  const favoriteCount = dbUser?._count?.favorites ?? 0;

  // Uploaded avatar takes priority over the OAuth provider avatar
  const avatarUrl =
    dbUser?.avatarUrl ?? (user.user_metadata?.avatar_url as string | null) ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-6">
        <AvatarUploader
          userId={user.id}
          currentUrl={avatarUrl}
          displayName={name}
        />
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">{orderCount}</p>
          <p className="mt-1 text-sm text-gray-500">Orders</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">{favoriteCount}</p>
          <p className="mt-1 text-sm text-gray-500">Favourites</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 space-y-3">
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-5 py-4 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <span>Seller dashboard</span>
          <span className="text-gray-400">→</span>
        </Link>
        <Link
          href="/account/orders"
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-5 py-4 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <span>My orders</span>
          <span className="text-gray-400">→</span>
        </Link>
        <Link
          href="/account/favourites"
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-5 py-4 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <span>Saved items</span>
          <span className="text-gray-400">→</span>
        </Link>
      </div>

      {/* Sign out */}
      <div className="mt-10 border-t border-gray-100 pt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
