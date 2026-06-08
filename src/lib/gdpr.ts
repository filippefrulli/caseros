import "server-only";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/service";

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string };

export async function checkDeletionEligibility(supabaseId: string): Promise<EligibilityResult> {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true, deletedAt: true, seller: { select: { id: true } } },
  });

  if (!user) return { eligible: false, reason: "Account not found." };
  if (user.deletedAt) return { eligible: false, reason: "Account is already deleted." };

  const buyerBlockingCount = await prisma.order.count({
    where: { buyerId: user.id, status: { in: ["PENDING", "PAID"] } },
  });
  if (buyerBlockingCount > 0) {
    return {
      eligible: false,
      reason: `You have ${buyerBlockingCount} active order${buyerBlockingCount === 1 ? "" : "s"} that must be completed or cancelled before you can delete your account.`,
    };
  }

  if (user.seller) {
    const sellerBlockingCount = await prisma.order.count({
      where: {
        items: { some: { sellerId: user.seller.id } },
        status: { in: ["PENDING", "PAID", "PROCESSING"] },
      },
    });
    if (sellerBlockingCount > 0) {
      return {
        eligible: false,
        reason: `You have ${sellerBlockingCount} active order${sellerBlockingCount === 1 ? "" : "s"} that must be shipped or resolved before you can close your seller account.`,
      };
    }
  }

  return { eligible: true };
}

export async function anonymiseAccount(supabaseId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { supabaseId },
      select: { id: true, seller: { select: { id: true } } },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        email: `deleted-${supabaseId}@deleted.invalid`,
        name: null,
        avatarUrl: null,
        deletedAt: new Date(),
      },
    });

    // Remove name and phone from order snapshots; keep address for tax/shipping records.
    await tx.order.updateMany({
      where: { buyerId: user.id },
      data: { shippingName: null, shippingPhone: null },
    });

    if (user.seller) {
      const sellerId = user.seller.id;

      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: {
          shopName: `deleted-${sellerId}`,
          slug: `deleted-${sellerId}`,
          bio: null,
          avatarUrl: null,
          bannerUrl: null,
          stripeAccountId: null,
          stripeOnboardingDone: false,
          payoutsEnabled: false,
          pickupName: null,
          pickupLine1: null,
          pickupLine2: null,
          pickupHouseNumber: null,
          pickupCity: null,
          pickupPostalCode: null,
          pickupCountry: null,
          pickupPhone: null,
        },
      });

      // Social links have no retention basis — delete immediately.
      await tx.sellerSocialLinks.deleteMany({ where: { sellerId } });

      // KYC must be retained under AML law (EU 6AMLD / Irish CJA 2010 s.55)
      // for 5 years after the business relationship ends. We keep for 6 years
      // (one-year buffer) and let the purge cron handle the final deletion.
      const SIX_YEARS_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;
      await tx.sellerKyc.updateMany({
        where: { sellerId },
        data: { retainUntil: new Date(Date.now() + SIX_YEARS_MS) },
      });

      // Hard-delete all listings. Prisma cascades handle the rest:
      // ListingImage → Cascade, Favorite (other users') → Cascade,
      // OrderItem.listingId → SetNull (snapshots preserved), Conversation.listingId → SetNull.
      await tx.listing.deleteMany({ where: { sellerId } });
    }
  });

  // Best-effort storage cleanup — non-fatal if any bucket fails.
  const supabase = createServiceClient();
  const buckets = ["avatars", "listing-images", "listing-videos"];
  await Promise.allSettled(
    buckets.map(async (bucket) => {
      const { data: files } = await supabase.storage.from(bucket).list(supabaseId);
      if (files && files.length > 0) {
        await supabase.storage
          .from(bucket)
          .remove(files.map((f) => `${supabaseId}/${f.name}`));
      }
    }),
  ).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn(`[gdpr] storage cleanup failed for bucket "${buckets[i]}" (non-fatal):`, r.reason);
      }
    });
  });

  // Delete the Supabase auth user last — after the DB is fully committed.
  // If this fails, the DB is already anonymised; an admin can remove the stale
  // auth entry manually.
  const { error } = await createServiceClient().auth.admin.deleteUser(supabaseId);
  if (error) {
    console.error("[gdpr] Supabase auth user deletion failed:", error.message);
  }
}
