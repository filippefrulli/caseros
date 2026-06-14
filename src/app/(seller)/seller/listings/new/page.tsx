import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ListingForm } from "@/components/seller/listing-form";
import { isIntegratedShippingEnabled } from "@/lib/platform-settings";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/listings/new");

  const [seller, categories] = await Promise.all([
    prisma.sellerProfile.findFirst({ where: { user: { supabaseId: user.id } }, select: { status: true, stripeOnboardingDone: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!seller) redirect("/seller/onboarding");
  if (seller.status !== "ACTIVE") redirect("/seller/dashboard");

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/seller/dashboard" className="inline-flex items-center rounded-lg border border-border p-2 text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors">
          <ChevronLeft size={25} />
        </Link>
        <h1 className="text-2xl font-bold">New listing</h1>
      </div>
      <ListingForm userId={user.id} categories={categories} stripeOnboardingDone={seller.stripeOnboardingDone} selfManagedShipping={!(await isIntegratedShippingEnabled())} />
    </main>
  );
}
