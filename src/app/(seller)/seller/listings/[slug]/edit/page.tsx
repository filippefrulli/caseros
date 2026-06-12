import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ListingForm } from "@/components/seller/listing-form";
import { isIntegratedShippingEnabled } from "@/lib/platform-settings";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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

  const seller = await prisma.sellerProfile.findFirst({ where: { user: { supabaseId: user.id } }, select: { status: true, stripeOnboardingDone: true } });
  if (seller?.status !== "ACTIVE") redirect("/seller/dashboard");

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/seller/dashboard" className="inline-flex items-center rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
          <ChevronLeft size={25} />
        </Link>
        <h1 className="text-2xl font-bold">Edit listing</h1>
      </div>
      <ListingForm
        userId={user.id}
        categories={categories}
        stripeOnboardingDone={seller?.stripeOnboardingDone ?? false}
        selfManagedShipping={!(await isIntegratedShippingEnabled())}
        listing={{
          id: listing.id,
          categoryId: listing.categoryId,
          title: listing.title,
          description: listing.description,
          priceAmount: listing.priceAmount,
          stock: listing.stock,
          status: listing.status,
          videoUrl: listing.videoUrl,
          isDigital: listing.isDigital,
          weightGrams: listing.weightGrams,
          lengthCm: listing.lengthCm,
          widthCm: listing.widthCm,
          heightCm: listing.heightCm,
          images: listing.images,
        }}
      />
    </main>
  );
}
