import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ListingImageCarousel } from "@/components/marketplace/listing-image-carousel";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { BuyNowButton } from "@/components/marketplace/buy-now-button";
import { StartConversationButton } from "@/components/messages/start-conversation-button";
import { ChevronLeft } from "lucide-react";
import { getVisitorCountry } from "@/lib/visitor-country";
import { countryName } from "@/lib/countries";

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

  // Parallelize: listing and dbUser are independent. We can't fetch the
  // Favorite row in parallel because it needs the listing id, but the user
  // lookup no longer blocks the page render.
  const [listing, dbUser] = await Promise.all([
    prisma.listing.findUnique({
      where: { slug, deletedAt: null },
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            stripeOnboardingDone: true,
            payoutsEnabled: true,
            shipsToCountries: true,
            user: { select: { supabaseId: true } },
          },
        },
        images: { orderBy: { position: "asc" } },
      },
    }),
    user
      ? prisma.user.findUnique({
          where: { supabaseId: user.id },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!listing) notFound();

  const isOwner = !!user && user.id === listing.seller.user.supabaseId;

  // Non-active listings are only visible to their owner.
  if (listing.status !== "ACTIVE" && !isOwner) notFound();

  const isFavorited = dbUser
    ? !!(await prisma.favorite.findUnique({
        where: { userId_listingId: { userId: dbUser.id, listingId: listing.id } },
      }))
    : false;

  // Physical items can only be bought by visitors in a country the seller ships
  // to. Digital items and unknown-country visitors are unrestricted here (the
  // visitor can still pick their country and checkout enforces it server-side).
  const visitorCountry = await getVisitorCountry();
  const shippable =
    listing.isDigital ||
    !visitorCountry ||
    listing.seller.shipsToCountries.includes(visitorCountry);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-5 pb-10">
      <Link href="/" className="mb-8 inline-flex items-center rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
        <ChevronLeft size={25} />
      </Link>

      {listing.status === "DRAFT" && (
        <div className="mb-6 rounded-lg border border-warning bg-warning-subtle px-4 py-3 text-sm text-warning-fg">
          This listing is a <strong>draft</strong>, only you can see it. Publish it from your dashboard when it&apos;s ready.
        </div>
      )}

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

          <div className="mt-8 flex items-end gap-3">
            {isOwner ? (
              <Link
                href={`/seller/listings/${listing.slug}/edit`}
                className="flex-1 rounded-xl border border-gray-900 py-3 text-center text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Edit listing
              </Link>
            ) : (
              <>
                {shippable ? (
                  <BuyNowButton
                    listingId={listing.id}
                    slug={listing.slug}
                    stock={listing.stock}
                    payable={listing.seller.stripeOnboardingDone && listing.seller.payoutsEnabled}
                    isLoggedIn={!!user}
                    isDigital={listing.isDigital}
                  />
                ) : (
                  <div className="flex-1 rounded-xl border border-warning bg-warning-subtle px-4 py-3 text-center text-sm text-warning-fg">
                    This seller doesn&apos;t ship to {countryName(visitorCountry!)}.
                  </div>
                )}
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

          {user && !isOwner && (
            <div className="mt-3">
              <StartConversationButton sellerId={listing.seller.id} />
            </div>
          )}

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
