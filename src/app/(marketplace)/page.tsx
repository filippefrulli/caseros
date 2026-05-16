import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FiltersBar } from "@/components/marketplace/filters-bar";
import { parseFilters, buildPriceWhere, buildOrderBy, fetchAvailableCountries, type FilterParams } from "@/lib/listing-filters";

export const metadata: Metadata = { title: "Home" };

type Props = { searchParams: Promise<FilterParams> };

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { selectedCountries, minPrice, maxPrice, sort } = parseFilters(sp);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [listings, favIds, sellerProfile, availableCountries] = await Promise.all([
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(selectedCountries.length ? { seller: { country: { in: selectedCountries } } } : {}),
        ...buildPriceWhere(minPrice, maxPrice),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        priceAmount: true,
        currency: true,
        sellerId: true,
        seller: { select: { shopName: true, slug: true } },
        images: { orderBy: { position: "asc" }, take: 1 },
      },
      orderBy: buildOrderBy(sort),
      take: 48,
    }),
    user
      ? prisma.favorite
          .findMany({
            where: { user: { supabaseId: user.id } },
            select: { listingId: true },
          })
          .then((favs) => new Set(favs.map((f) => f.listingId)))
      : Promise.resolve(new Set<string>()),
    user
      ? prisma.sellerProfile.findFirst({
          where: { user: { supabaseId: user.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    fetchAvailableCountries(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <FiltersBar availableCountries={availableCountries} />
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {listings.slice(0, 8).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={favIds.has(listing.id)}
              isLoggedIn={!!user}
              hideFavorite={!!sellerProfile && listing.sellerId === sellerProfile.id}
            />
          ))}

          {listings.length > 8 && (
            <div className="col-span-full rounded-2xl px-8 py-10 text-accent-fg" style={{ backgroundColor: "#6a9bcc" }}>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-60">Our promise</p>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">Real. Handmade. European.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-80">
                Every listing on Caseros is a genuine handmade item crafted by an independent maker based in the EU.
                Dropshipping and AI-generated product images are strictly not allowed.
              </p>
              <p className="mt-4 text-xs opacity-50">
                While we do our best to uphold these standards — if you spot an AI image or a dropshipped product, please use the report function on the listing.
              </p>
            </div>
          )}

          {listings.slice(8).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={favIds.has(listing.id)}
              isLoggedIn={!!user}
              hideFavorite={!!sellerProfile && listing.sellerId === sellerProfile.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="text-text-muted">No listings found.</p>
          <p className="mt-1 text-sm text-text-muted">
            Try adjusting your filters or browse all listings.
          </p>
        </div>
      )}
    </main>
  );
}
