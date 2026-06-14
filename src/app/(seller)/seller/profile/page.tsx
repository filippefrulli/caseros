import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProfileForm } from "@/components/seller/profile-form";
import { PickupAddressForm } from "@/components/seller/pickup-address-form";
import { ShipsToForm } from "@/components/seller/ships-to-form";

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
  if (seller.status !== "ACTIVE") redirect("/seller/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/seller/dashboard" className="inline-flex items-center rounded-lg border border-border p-2 text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors">
          <ChevronLeft size={25} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{seller.shopName}</h1>
          <p className="text-sm text-text-muted">{seller.country}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-border p-6">
          <ProfileForm bio={seller.bio} socialLinks={seller.socialLinks} />
        </section>

        <section className="rounded-xl border border-border p-6">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">Pickup / return address</h2>
          <p className="mb-4 text-xs text-text-secondary">
            Used as the sender address on shipping labels. Required before publishing physical listings.
          </p>
          <PickupAddressForm
            initial={{
              pickupName: seller.pickupName,
              pickupLine1: seller.pickupLine1,
              pickupLine2: seller.pickupLine2,
              pickupHouseNumber: seller.pickupHouseNumber,
              pickupCity: seller.pickupCity,
              pickupPostalCode: seller.pickupPostalCode,
              pickupCountry: seller.pickupCountry,
              pickupPhone: seller.pickupPhone,
            }}
          />
        </section>

        <section className="rounded-xl border border-border p-6 lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">Ships to</h2>
          <p className="mb-4 text-xs text-text-secondary">
            You cover delivery costs, so choose which countries you&apos;ll ship to. Buyers in
            other countries won&apos;t see your listings.
          </p>
          <ShipsToForm initial={seller.shipsToCountries} />
        </section>
      </div>
    </main>
  );
}
