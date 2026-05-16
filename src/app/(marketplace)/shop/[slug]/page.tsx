import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/marketplace/listing-card";
import { ShopTabs } from "@/components/marketplace/shop-tabs";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seller = await prisma.sellerProfile.findUnique({ where: { slug }, select: { shopName: true } });
  return { title: seller?.shopName ?? "Shop not found" };
}

const PLATFORMS = [
  { key: "website",   label: "Website" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok",    label: "TikTok" },
  { key: "youtube",   label: "YouTube" },
  { key: "facebook",  label: "Facebook" },
  { key: "twitter",   label: "X / Twitter" },
  { key: "pinterest", label: "Pinterest" },
  { key: "linkedin",  label: "LinkedIn" },
] as const;

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [seller, favIds] = await Promise.all([
    prisma.sellerProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { supabaseId: true } },
        socialLinks: true,
        listings: {
          where: { status: "ACTIVE", deletedAt: null },
          select: {
            id: true,
            slug: true,
            title: true,
            priceAmount: true,
            currency: true,
            seller: { select: { shopName: true, slug: true } },
            images: { orderBy: { position: "asc" }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    user
      ? prisma.favorite
          .findMany({ where: { user: { supabaseId: user.id } }, select: { listingId: true } })
          .then((favs) => new Set(favs.map((f) => f.listingId)))
      : Promise.resolve(new Set<string>()),
  ]);

  if (!seller) notFound();

  const isOwner = !!user && user.id === seller.user.supabaseId;

  // ── Listings tab ───────────────────────────────────────────────────────────
  const listingsContent = seller.listings.length > 0 ? (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {seller.listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isFavorited={favIds.has(listing.id)}
          isLoggedIn={!!user}
          hideShopLink
          hideFavorite={isOwner}
        />
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-24 text-center">
      <p className="text-gray-400">No listings yet.</p>
    </div>
  );

  // ── About tab ──────────────────────────────────────────────────────────────
  const { socialLinks } = seller;
  const activePlatforms = socialLinks
    ? PLATFORMS.filter(({ key }) => !!socialLinks[key])
    : [];

  const aboutContent = (
    <div className="max-w-2xl space-y-10">
      {seller.bio && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">About</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{seller.bio}</p>
        </section>
      )}

      {activePlatforms.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Find us online</h2>
          <div className="space-y-2">
            {activePlatforms.map(({ key, label }) => {
              const url = socialLinks![key] as string;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 text-sm group"
                >
                  <span className="w-24 shrink-0 font-medium text-gray-700">{label}</span>
                  <span className="truncate text-gray-400 group-hover:text-gray-900 transition-colors">
                    {url.replace(/^https?:\/\/(www\.)?/, "")}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {!seller.bio && activePlatforms.length === 0 && (
        <p className="text-sm text-gray-400">This seller hasn't added any information yet.</p>
      )}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{seller.shopName}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {seller.listings.length} listing{seller.listings.length === 1 ? "" : "s"}
        </p>
      </div>

      <ShopTabs listingsContent={listingsContent} aboutContent={aboutContent} />
    </main>
  );
}
