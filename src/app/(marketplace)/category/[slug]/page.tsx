import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FiltersBar } from "@/components/marketplace/filters-bar";
import { parseFilters, buildPriceWhere, buildShipsToWhere, buildOrderBy, fetchAvailableCountries, type FilterParams } from "@/lib/listing-filters";
import { getVisitorCountry } from "@/lib/visitor-country";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<FilterParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug }, select: { name: true } });
  return { title: cat?.name ?? "Category not found" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { selectedCountries, minPrice, maxPrice, sort } = parseFilters(sp);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const visitorCountry = await getVisitorCountry();

  const [category, listings, favIds, availableCountries] = await Promise.all([
    prisma.category.findUnique({ where: { slug } }),
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        category: { slug },
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
    fetchAvailableCountries(),
  ]);

  if (!category) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 pt-5 pb-10">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
          <ChevronLeft size={25} />
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-1 text-text-secondary">{category.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            {listings.length} item{listings.length === 1 ? "" : "s"}
          </p>
          <FiltersBar availableCountries={availableCountries} />
        </div>
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing, i) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={favIds.has(listing.id)}
              isLoggedIn={!!user}
              priority={i === 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="text-text-muted">No listings in this category yet.</p>
          <Link
            href="/"
            className="mt-3 text-sm font-medium text-text-primary underline underline-offset-4"
          >
            Browse all listings
          </Link>
        </div>
      )}
    </main>
  );
}
