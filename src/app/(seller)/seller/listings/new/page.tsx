import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ListingForm } from "@/components/seller/listing-form";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/listings/new");

  const [seller, categories] = await Promise.all([
    prisma.sellerProfile.findFirst({ where: { user: { supabaseId: user.id } } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!seller) redirect("/seller/onboarding");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/seller/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">New listing</h1>
      </div>
      <ListingForm userId={user.id} categories={categories} />
    </main>
  );
}
