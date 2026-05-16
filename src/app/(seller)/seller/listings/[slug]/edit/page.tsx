import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ListingForm } from "@/components/seller/listing-form";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "Edit listing" };

type Props = { params: Promise<{ slug: string }> };

export default async function EditListingPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/seller/listings/${slug}/edit`);

  const [listing, categories] = await Promise.all([
    prisma.listing.findUnique({
      where: { slug, deletedAt: null },
      include: {
        seller: { select: { user: { select: { supabaseId: true } } } },
        images: { orderBy: { position: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!listing) notFound();
  if (listing.seller.user.supabaseId !== user.id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/seller/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Edit listing</h1>
      </div>
      <ListingForm
        userId={user.id}
        categories={categories}
        listing={{
          id: listing.id,
          categoryId: listing.categoryId,
          title: listing.title,
          description: listing.description,
          priceAmount: listing.priceAmount,
          stock: listing.stock,
          status: listing.status,
          videoUrl: listing.videoUrl,
          images: listing.images,
        }}
      />
    </main>
  );
}
