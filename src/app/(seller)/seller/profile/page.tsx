import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "@/components/seller/profile-form";

export const metadata: Metadata = { title: "Edit profile" };

export default async function SellerProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/profile");

  const seller = await prisma.sellerProfile.findFirst({
    where: { user: { supabaseId: user.id } },
    include: { socialLinks: true },
  });
  if (!seller) redirect("/seller/onboarding");

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/seller/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Edit profile</h1>
      </div>

      {/* Read-only shop identity */}
      <section className="mb-8 rounded-xl border border-gray-200 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Shop identity</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Shop name</dt>
            <dd className="text-sm font-medium text-gray-900">{seller.shopName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Shop URL</dt>
            <dd className="text-sm font-medium text-gray-900">/shop/{seller.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Country</dt>
            <dd className="text-sm font-medium text-gray-900">{seller.country}</dd>
          </div>
        </dl>
      </section>

      <ProfileForm
        bio={seller.bio}
        socialLinks={seller.socialLinks}
      />
    </main>
  );
}
