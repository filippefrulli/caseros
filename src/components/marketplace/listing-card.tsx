import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { FavoriteButton } from "@/components/marketplace/favorite-button";

type Props = {
  listing: {
    id: string;
    slug: string;
    title: string;
    priceAmount: number;
    currency: string;
    images: { url: string; altText: string | null }[];
    seller: { shopName: string; slug: string };
  };
  isFavorited?: boolean;
  isLoggedIn?: boolean;
  hideShopLink?: boolean;
  hideFavorite?: boolean;
};

export function ListingCard({ listing, isFavorited = false, isLoggedIn = false, hideShopLink = false, hideFavorite = false }: Props) {
  const image = listing.images[0];

  return (
    <div className="group/card relative">
      {/* Image → listing */}
      <Link href={`/listings/${listing.slug}`} className="block aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? listing.title}
            width={400}
            height={400}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <Package size={40} strokeWidth={1.5} />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="mt-2.5 space-y-0.5">
        <Link href={`/listings/${listing.slug}`} className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-gray-600">
          {listing.title}
        </Link>
        {!hideShopLink && (
          <Link href={`/shop/${listing.seller.slug}`} className="block text-xs text-gray-400 transition-colors hover:text-gray-700">
            {listing.seller.shopName}
          </Link>
        )}
        <p className="text-sm font-semibold text-gray-900">
          {formatPrice(listing.priceAmount, listing.currency)}
        </p>
      </div>

      {!hideFavorite && (
        <FavoriteButton
          listingId={listing.id}
          isFavorited={isFavorited}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
