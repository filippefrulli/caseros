import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/marketplace/listing-card";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      seller: { select: { shopName: true, slug: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Handmade goods from European artisans
        </h1>
        <p className="mt-2 text-gray-500">
          {listings.length > 0
            ? `${listings.length} item${listings.length === 1 ? "" : "s"} available`
            : "Be the first to list something."}
        </p>
      </div>

      {/* Grid */}
      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-24 text-center">
          <p className="text-gray-400">No listings yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Open a shop and create your first listing to get started.
          </p>
        </div>
      )}
    </main>
  );
}
