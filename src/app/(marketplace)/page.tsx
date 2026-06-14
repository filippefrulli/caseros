import type { Metadata } from "next";
import { BadgeCheck, PackageX, ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/marketplace/listing-card";
import { SellerCarousel, type SellerCarouselItem } from "@/components/marketplace/seller-carousel";
import { FiltersBar } from "@/components/marketplace/filters-bar";
import { parseFilters, buildPriceWhere, buildShipsToWhere, buildOrderBy, fetchAvailableCountries, type FilterParams } from "@/lib/listing-filters";
import { getVisitorCountry } from "@/lib/visitor-country";

export const metadata: Metadata = { title: "Home" };

type Props = { searchParams: Promise<FilterParams> };

const CAROUSEL_INTERVAL = 16; // every 16 listings = 8 rows at 2-col mobile

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { selectedCountries, minPrice, maxPrice, sort } = parseFilters(sp);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const visitorCountry = await getVisitorCountry();

  const [listings, favIds, sellerProfile, availableCountries, featuredSellers] = await Promise.all([
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(selectedCountries.length ? { seller: { country: { in: selectedCountries } } } : {}),
        ...buildPriceWhere(minPrice, maxPrice),
        ...buildShipsToWhere(visitorCountry),
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
      // Stable order, without orderBy Postgres returns whatever it wants and
      // visitors see a different "featured" set on every refresh.
      orderBy: { createdAt: "desc" },
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
      {/* ── Welcome hero ── warm, serif, human-first greeting */}
      <section className="mb-8 overflow-hidden rounded-3xl border border-brand/30 bg-brand-subtle px-6 py-12 text-center sm:px-12 sm:py-16">
        <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
          Real things, made by real people across Europe
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary">
          Every piece is crafted by an independent maker in the EU! Discover something
          one of a kind, and buy it straight from the hands that made it.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-text-secondary">
          <span className="flex items-center gap-2">
            <BadgeCheck size={16} className="text-brand" strokeWidth={2} />
            Verified sellers
          </span>
          <span className="flex items-center gap-2">
            <PackageX size={16} className="text-brand" strokeWidth={2} />
            No drop-shipping
          </span>
          <span className="flex items-center gap-2">
            <ImageOff size={16} className="text-brand" strokeWidth={2} />
            No AI images
          </span>
        </div>
      </section>

      <div className="mb-6">
        <FiltersBar availableCountries={availableCountries} />
      </div>

      {listings.length > 0 ? (
        <>
          <h2 className="mb-4 font-display text-2xl font-semibold text-text-primary">
            Fresh from European makers
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {gridItems}
          </div>

          <div
            className="mt-12 rounded-2xl px-8 py-10 text-white"
            style={{ backgroundImage: "linear-gradient(135deg, #2E4D8E, #1F3A6E)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Our promise</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Real. Handmade. European.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-90">
              Every listing on Caseros is a genuine item crafted by an independent maker based in the EU.
              Your money, your activity, and your information all stay in Europe.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card py-24 text-center">
          <p className="font-display text-xl font-semibold text-text-primary">Nothing here just yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
            No makers match these filters right now. Try widening your search, there&apos;s plenty
            more handmade waiting.
          </p>
        </div>
      )}
    </main>
  );
}
