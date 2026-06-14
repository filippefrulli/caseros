import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export type SellerCarouselItem = {
  shopName: string;
  slug: string;
  listings: {
    slug: string;
    title: string;
    priceAmount: number;
    currency: string;
    images: { url: string; altText: string | null }[];
  }[];
};

export function SellerCarousel({ shopName, slug, listings }: SellerCarouselItem) {
  if (listings.length === 0) return null;

  return (
    <div className="col-span-full rounded-2xl border border-border bg-bg-subtle px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/shop/${slug}`}
          className="text-base font-semibold text-text-primary hover:text-text-secondary transition-colors"
        >
          {shopName}
        </Link>
        <Link
          href={`/shop/${slug}`}
          className="flex items-center gap-0.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          View shop <ChevronRight size={12} />
        </Link>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {listings.map((listing) => {
          const image = listing.images[0];
          return (
            <Link
              key={listing.slug}
              href={`/listings/${listing.slug}`}
              className="group/carousel shrink-0 w-36 sm:w-48"
            >
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-bg-subtle">
                {image && (
                  <Image
                    src={image.url}
                    alt={image.altText ?? listing.title}
                    width={192}
                    height={256}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/carousel:scale-105"
                  />
                )}
              </div>
              <p className="mt-1.5 truncate text-xs font-medium text-text-primary">{listing.title}</p>
              <p className="text-xs text-text-secondary">{formatPrice(listing.priceAmount, listing.currency)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
