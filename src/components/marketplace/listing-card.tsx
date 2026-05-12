import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Props = {
  listing: {
    slug: string;
    title: string;
    priceAmount: number;
    currency: string;
    images: { url: string; altText: string | null }[];
    seller: { shopName: string };
  };
};

export function ListingCard({ listing }: Props) {
  const image = listing.images[0];

  return (
    <Link href={`/listings/${listing.slug}`} className="group block">
      {/* Image */}
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? listing.title}
            width={400}
            height={400}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <Package size={40} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2.5 space-y-0.5">
        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors">
          {listing.title}
        </p>
        <p className="text-xs text-gray-400">{listing.seller.shopName}</p>
        <p className="text-sm font-semibold text-gray-900">
          {formatPrice(listing.priceAmount, listing.currency)}
        </p>
      </div>
    </Link>
  );
}
