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

export function parseFilters(sp: FilterParams): ParsedFilters {
  const sort = VALID_SORTS.includes(sp.sort as SortOption)
    ? (sp.sort as SortOption)
    : "newest";
  return {
    selectedCountries: (sp.countries ?? "").split(",").filter(Boolean),
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
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

export async function fetchAvailableCountries(): Promise<Country[]> {
  const rows = await prisma.sellerProfile.findMany({
    where: { listings: { some: { status: "ACTIVE", deletedAt: null } } },
    select: { country: true },
    distinct: ["country"],
  });

  const fmt = new Intl.DisplayNames(["en"], { type: "region" });
  return rows
    .map(({ country }) => ({ code: country, name: fmt.of(country) ?? country }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
