import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CopyShopLink } from "@/components/seller/copy-shop-link";

export const metadata: Metadata = { title: "Seller Dashboard" };

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      seller: {
        include: {
          _count: { select: { listings: true } },
        },
      },
    },
  });

  if (!dbUser?.seller) redirect("/seller/onboarding");

  const { seller } = dbUser;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{seller.shopName}</h1>
        <div className="mt-4 flex items-center gap-3">
          <CopyShopLink slug={seller.slug} />
          <Link
            href="/seller/profile"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit profile
          </Link>
          <Link
            href="/seller/listings/new"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            New listing
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">{seller._count.listings}</p>
          <p className="mt-1 text-sm text-gray-500">Listings</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">0</p>
          <p className="mt-1 text-sm text-gray-500">Orders</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">€0</p>
          <p className="mt-1 text-sm text-gray-500">Revenue</p>
        </div>
      </div>

      {/* Empty state */}
      {seller._count.listings === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">You have no listings yet.</p>
          <Link
            href="/seller/listings/new"
            className="mt-4 inline-block text-sm font-medium text-gray-900 underline underline-offset-4"
          >
            Create your first listing
          </Link>
        </div>
      )}
    </main>
  );
}
