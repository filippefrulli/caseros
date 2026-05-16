import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ListingImageCarousel } from "@/components/marketplace/listing-image-carousel";
import { FavoriteButton } from "@/components/marketplace/favorite-button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.listing.findUnique({ where: { slug }, select: { title: true } });
  return { title: listing?.title ?? "Listing not found" };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const listing = await prisma.listing.findUnique({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      seller: { select: { shopName: true, slug: true, user: { select: { supabaseId: true } } } },
      images: { orderBy: { position: "asc" } },
    },
  });

  if (!listing) notFound();

  const isOwner = !!user && user.id === listing.seller.user.supabaseId;

  let isFavorited = false;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    });
    if (dbUser) {
      const fav = await prisma.favorite.findUnique({
        where: { userId_listingId: { userId: dbUser.id, listingId: listing.id } },
      });
      isFavorited = !!fav;
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/" className="mb-8 inline-block text-sm text-gray-500 hover:text-gray-900 transition-colors">
        ← Back to listings
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Images */}
        <ListingImageCarousel images={listing.images} title={listing.title} />

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-sm text-gray-400">
            <Link href={`/shop/${listing.seller.slug}`} className="hover:text-gray-700 transition-colors">
              {listing.seller.shopName}
            </Link>
          </p>

          <h1 className="mt-2 text-2xl font-bold">{listing.title}</h1>

          <p className="mt-4 text-2xl font-semibold">
            {formatPrice(listing.priceAmount, listing.currency)}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            {listing.stock > 0 ? `${listing.stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-8 flex gap-3">
            {isOwner ? (
              <Link
                href={`/seller/listings/${listing.slug}/edit`}
                className="flex-1 rounded-xl border border-gray-900 py-3 text-center text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Edit listing
              </Link>
            ) : (
              <>
                <button
                  disabled
                  className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-40"
                >
                  Buy now — coming soon
                </button>
                <FavoriteButton
                  listingId={listing.id}
                  isFavorited={isFavorited}
                  isLoggedIn={!!user}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-50"
                  iconSize={20}
                />
              </>
            )}
          </div>

          {listing.description && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h2 className="mb-2 text-sm font-medium text-gray-700">Description</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{listing.description}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
