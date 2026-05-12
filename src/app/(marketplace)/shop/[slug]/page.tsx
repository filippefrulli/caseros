import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/marketplace/listing-card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seller = await prisma.sellerProfile.findUnique({ where: { slug }, select: { shopName: true } });
  return { title: seller?.shopName ?? "Shop not found" };
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;

  const seller = await prisma.sellerProfile.findUnique({
    where: { slug },
    include: {
      listings: {
        where: { status: "ACTIVE", deletedAt: null },
        include: {
          seller: { select: { shopName: true, slug: true } },
          images: { orderBy: { position: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!seller) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{seller.shopName}</h1>
        {seller.bio && (
          <p className="mt-2 text-gray-500">{seller.bio}</p>
        )}
        <p className="mt-1 text-sm text-gray-400">
          {seller.listings.length} listing{seller.listings.length === 1 ? "" : "s"}
        </p>
      </div>

      {seller.listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {seller.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-24 text-center">
          <p className="text-gray-400">No listings yet.</p>
        </div>
      )}
    </main>
  );
}
