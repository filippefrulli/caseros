import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Country } from "@/components/marketplace/filters-bar";

export type SortOption = "newest" | "price_asc" | "price_desc";

export type FilterParams = {
  countries?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};

export type ParsedFilters = {
  selectedCountries: string[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
  sort: SortOption;
};

const VALID_SORTS: SortOption[] = ["newest", "price_asc", "price_desc"];

// Hard caps — prevent bots from passing `minPrice=1e308` (→ Infinity, breaks
// Prisma) or `countries=aa,bb,...` with 10k entries (→ huge IN clause).
const MAX_PRICE_EUR = 1_000_000;
const MAX_COUNTRIES = 30;

function clampPrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(Math.floor(n), MAX_PRICE_EUR);
}

export function parseFilters(sp: FilterParams): ParsedFilters {
  const sort = VALID_SORTS.includes(sp.sort as SortOption)
    ? (sp.sort as SortOption)
    : "newest";
  return {
    selectedCountries: (sp.countries ?? "")
      .split(",")
      .filter((c) => /^[A-Z]{2}$/.test(c))
      .slice(0, MAX_COUNTRIES),
    minPrice: clampPrice(sp.minPrice),
    maxPrice: clampPrice(sp.maxPrice),
    sort,
  };
}

export function buildOrderBy(sort: SortOption) {
  if (sort === "price_asc") return { priceAmount: "asc" as const };
  if (sort === "price_desc") return { priceAmount: "desc" as const };
  return { createdAt: "desc" as const };
}

export function buildPriceWhere(minPrice?: number, maxPrice?: number) {
  if (minPrice === undefined && maxPrice === undefined) return {};
  return {
    priceAmount: {
      ...(minPrice !== undefined ? { gte: minPrice * 100 } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice * 100 } : {}),
    },
  };
}

// Country list rarely changes; rebuilt every hour. Avoids hitting the DB on
// every home / category / search page load.
export const fetchAvailableCountries = unstable_cache(
  async (): Promise<Country[]> => {
    const rows = await prisma.sellerProfile.findMany({
      where: { listings: { some: { status: "ACTIVE", deletedAt: null } } },
      select: { country: true },
      distinct: ["country"],
    });

    const fmt = new Intl.DisplayNames(["en"], { type: "region" });
    return rows
      .map(({ country }) => ({ code: country, name: fmt.of(country) ?? country }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  ["available-countries"],
  { revalidate: 3600 },
);
