import { prisma } from "@/lib/prisma";
import type { Country } from "@/components/marketplace/filters-bar";

export type FilterParams = {
  countries?: string;
  minPrice?: string;
  maxPrice?: string;
};

export type ParsedFilters = {
  selectedCountries: string[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
};

export function parseFilters(sp: FilterParams): ParsedFilters {
  return {
    selectedCountries: (sp.countries ?? "").split(",").filter(Boolean),
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
  };
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
