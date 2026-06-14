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
  priority?: boolean;
};

export function ListingCard({ listing, isFavorited = false, isLoggedIn = false, hideShopLink = false, hideFavorite = false, priority = false }: Props) {
  const image = listing.images[0];

  return (
    <div className="group/card relative">
      {/* Image → listing */}
      <Link href={`/listings/${listing.slug}`} className="block aspect-[3/4] w-full overflow-hidden rounded-xl bg-bg-subtle">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? listing.title}
            width={400}
            height={400}
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <Package size={40} strokeWidth={1.5} />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="mt-2.5 space-y-0.5">
        <Link href={`/listings/${listing.slug}`} className="block truncate text-sm font-medium text-text-primary transition-colors hover:text-text-secondary">
          {listing.title}
        </Link>
        {!hideShopLink && (
          <Link href={`/shop/${listing.seller.slug}`} className="block text-xs text-text-muted transition-colors hover:text-text-secondary">
            {listing.seller.shopName}
          </Link>
        )}
        <p className="text-sm font-semibold text-text-primary">
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
