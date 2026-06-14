import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AddressBook } from "@/components/buyer/address-book";

export const metadata: Metadata = { title: "Addresses: Caseros" };

export default async function AccountAddressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/address");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });

  const addresses = dbUser
    ? await prisma.address.findMany({
        where: { userId: dbUser.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          line1: true,
          houseNumber: true,
          line2: true,
          city: true,
          postalCode: true,
          country: true,
          phone: true,
          isDefault: true,
        },
      })
    : [];

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-12">
      <Link
        href="/account"
        className="mb-6 inline-flex items-center rounded-lg border border-border p-2 text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
      >
        <ChevronLeft size={25} />
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Addresses</h1>
      <p className="mb-8 text-sm text-text-secondary">Your saved delivery addresses.</p>
      <AddressBook addresses={addresses} />
    </main>
  );
}
