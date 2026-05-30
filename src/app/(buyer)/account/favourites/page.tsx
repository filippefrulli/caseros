import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ListingCard } from "@/components/marketplace/listing-card";

export const metadata: Metadata = { title: "Saved Items" };

export default async function FavouritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/favourites");

  const favorites = await prisma.favorite.findMany({
    where: { user: { supabaseId: user.id } },
    include: {
      listing: {
        include: {
          seller: { select: { shopName: true, slug: true } },
          images: { orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Exclude soft-deleted listings
  const listings = favorites
    .map((f) => f.listing)
    .filter((l) => l.deletedAt === null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/account" className="inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Saved items</h1>
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={true}
              isLoggedIn={true}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-24 text-center">
          <p className="text-gray-400">No saved items yet.</p>
          <Link
            href="/"
            className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-4"
          >
            Browse listings
          </Link>
        </div>
      )}
    </main>
  );
}
