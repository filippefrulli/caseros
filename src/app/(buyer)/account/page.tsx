import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AvatarUploader } from "@/components/seller/avatar-uploader";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { MapPin, ShoppingBag, Heart } from "lucide-react";

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
  const memberSinceDate = dbUser?.createdAt ?? (user.created_at ? new Date(user.created_at) : null);
  const memberSince = memberSinceDate
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(memberSinceDate)
    : null;

  // Uploaded avatar takes priority over the OAuth provider avatar
  const avatarUrl =
    dbUser?.avatarUrl ?? (user.user_metadata?.avatar_url as string | null) ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-12">
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
          {memberSince && (
            <p className="mt-1 text-xs text-gray-400">Member since {memberSince}</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-12">
        <Link href="/account/orders" className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors">
          <ShoppingBag size={18} className="shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Orders</p>
            <p className="text-xs text-gray-400">{orderCount} total</p>
          </div>
        </Link>
        <Link href="/account/favourites" className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors">
          <Heart size={18} className="shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Favourites</p>
            <p className="text-xs text-gray-400">{favoriteCount} saved</p>
          </div>
        </Link>
        <Link href="/account/address" className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors">
          <MapPin size={18} className="shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Addresses</p>
            <p className="text-xs text-gray-400">Manage delivery addresses</p>
          </div>
        </Link>
      </div>
      {/* Danger zone */}
      <div className="border-t border-border pt-8">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Danger zone</h2>
        <p className="text-sm text-text-muted mb-4">
          Permanently delete your account and erase your personal data.
        </p>
        <DeleteAccountDialog />
      </div>
    </main>
  );
}
