import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AddressForm } from "@/components/buyer/address-form";

export const metadata: Metadata = { title: "Shipping address" };

export default async function AccountAddressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/address");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });

  const saved = dbUser
    ? await prisma.address.findFirst({
        where: { userId: dbUser.id, isDefault: true },
        select: { id: true, name: true, line1: true, houseNumber: true, line2: true, city: true, postalCode: true, country: true, phone: true },
      })
    : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <Link href="/account" className="mb-6 inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
        <ChevronLeft size={20} />
      </Link>
      <h1 className="mb-8 text-2xl font-bold">Shipping address</h1>
      <AddressForm initial={saved} />
    </main>
  );
}
