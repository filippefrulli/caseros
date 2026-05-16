import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FiltersBar } from "@/components/marketplace/filters-bar";
import { buildSearchQuery } from "@/lib/search-synonyms";
import { parseFilters, buildPriceWhere, buildOrderBy, fetchAvailableCountries, type FilterParams } from "@/lib/listing-filters";

type Props = { searchParams: Promise<{ q?: string } & FilterParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q?.trim() ? `"${q.trim()}" — Search` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const { selectedCountries, minPrice, maxPrice, sort } = parseFilters(sp);

  if (!q) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-24 text-center">
        <p className="text-text-muted">Enter a search term to find listings.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const expandedQuery = buildSearchQuery(q);

  let rankedIds: { id: string }[];
  try {
    rankedIds = expandedQuery
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT l.id
          FROM listings l
          WHERE l.status = 'ACTIVE'
            AND l.deleted_at IS NULL
            AND to_tsvector('english', l.title || ' ' || l.description)
                @@ to_tsquery('english', ${expandedQuery})
          ORDER BY ts_rank(
            to_tsvector('english', l.title || ' ' || l.description),
            to_tsquery('english', ${expandedQuery})
          ) DESC
          LIMIT 48
        `
      : [];
  } catch {
    rankedIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT l.id
      FROM listings l
      WHERE l.status = 'ACTIVE'
        AND l.deleted_at IS NULL
        AND to_tsvector('english', l.title || ' ' || l.description)
            @@ websearch_to_tsquery('english', ${q})
      ORDER BY ts_rank(
        to_tsvector('english', l.title || ' ' || l.description),
        websearch_to_tsquery('english', ${q})
      ) DESC
      LIMIT 48
    `;
  }

  const ids = rankedIds.map((r) => r.id);

  const [listingsUnordered, favIds, sellerProfile, availableCountries] = await Promise.all([
    ids.length === 0
      ? Promise.resolve([])
      : prisma.listing.findMany({
          where: {
            id: { in: ids },
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
          ...(sort !== "newest" ? { orderBy: buildOrderBy(sort) } : {}),
        }),
    user
      ? prisma.favorite
          .findMany({ where: { user: { supabaseId: user.id } }, select: { listingId: true } })
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

  const listings = sort === "newest"
    ? (() => {
        const listingById = new Map(listingsUnordered.map((l) => [l.id, l]));
        return ids.map((id) => listingById.get(id)).filter(Boolean) as typeof listingsUnordered;
      })()
    : listingsUnordered;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {listings.length === 0
            ? `No results for "${q}"`
            : `${listings.length} result${listings.length === 1 ? "" : "s"} for "${q}"`}
        </p>
        <FiltersBar availableCountries={availableCountries} />
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
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
          <p className="text-text-muted">No listings match your search.</p>
          <p className="mt-1 text-sm text-text-muted">Try different keywords or adjust your filters.</p>
        </div>
      )}
    </main>
  );
}
