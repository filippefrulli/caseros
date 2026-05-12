import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "Shop profile" };

export default async function SellerProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/profile");

  const seller = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
  });
  if (!seller) redirect("/seller/onboarding");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Shop profile</h1>
      </div>

      <section className="rounded-xl border border-gray-200 p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Shop details</h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-xs text-gray-400">Shop name</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{seller.shopName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Shop URL</dt>
            <dd className="mt-0.5 text-sm text-gray-900">/shop/{seller.slug}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Bio</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {seller.bio ?? <span className="text-gray-400">No bio yet</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Country</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{seller.country}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
