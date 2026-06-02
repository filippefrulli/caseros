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
    <div className="col-span-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/shop/${slug}`}
          className="text-base font-semibold text-gray-900 hover:text-gray-600 transition-colors"
        >
          {shopName}
        </Link>
        <Link
          href={`/shop/${slug}`}
          className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
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
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
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
              <p className="mt-1.5 truncate text-xs font-medium text-gray-900">{listing.title}</p>
              <p className="text-xs text-gray-500">{formatPrice(listing.priceAmount, listing.currency)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
