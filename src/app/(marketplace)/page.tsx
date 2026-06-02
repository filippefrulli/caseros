import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/marketplace/listing-card";
import { SellerCarousel, type SellerCarouselItem } from "@/components/marketplace/seller-carousel";
import { FiltersBar } from "@/components/marketplace/filters-bar";
import { parseFilters, buildPriceWhere, buildOrderBy, fetchAvailableCountries, type FilterParams } from "@/lib/listing-filters";

export const metadata: Metadata = { title: "Home" };

type Props = { searchParams: Promise<FilterParams> };

const CAROUSEL_INTERVAL = 16; // every 16 listings = 8 rows at 2-col mobile

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { selectedCountries, minPrice, maxPrice, sort } = parseFilters(sp);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [listings, favIds, sellerProfile, availableCountries, featuredSellers] = await Promise.all([
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
    prisma.sellerProfile.findMany({
      where: {
        status: "ACTIVE",
        listings: { some: { status: "ACTIVE", deletedAt: null } },
      },
      select: {
        shopName: true,
        slug: true,
        listings: {
          where: { status: "ACTIVE", deletedAt: null },
          select: {
            slug: true,
            title: true,
            priceAmount: true,
            currency: true,
            images: { orderBy: { position: "asc" }, take: 1, select: { url: true, altText: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
      },
      take: 4,
    }).then((sellers) => sellers.filter((s) => s.listings.length >= 2) as SellerCarouselItem[]),
  ]);

  // Build grid items, injecting a seller carousel every CAROUSEL_INTERVAL listings
  const gridItems: React.ReactNode[] = [];
  let carouselIdx = 0;

  listings.forEach((listing, i) => {
    if (i > 0 && i % CAROUSEL_INTERVAL === 0 && carouselIdx < featuredSellers.length) {
      const seller = featuredSellers[carouselIdx++];
      gridItems.push(<SellerCarousel key={`carousel-${seller.slug}`} {...seller} />);
    }
    gridItems.push(
      <ListingCard
        key={listing.id}
        listing={listing}
        isFavorited={favIds.has(listing.id)}
        isLoggedIn={!!user}
        hideFavorite={!!sellerProfile && listing.sellerId === sellerProfile.id}
        priority={i === 0}
      />
    );
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pt-4 pb-8">
      <div className="mb-6">
        <FiltersBar availableCountries={availableCountries} />
      </div>

      {listings.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {gridItems}
          </div>

          <div className="mt-8 rounded-2xl px-8 py-10 text-accent-fg" style={{ backgroundColor: "#6a9bcc" }}>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60">Our promise</p>
            <h2 className="mt-2 text-xl font-bold sm:text-2xl">Real. Handmade. European.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-80">
              Every listing on Caseros is a genuine item crafted by an independent maker based in the EU.
            </p>
          </div>
        </>
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
