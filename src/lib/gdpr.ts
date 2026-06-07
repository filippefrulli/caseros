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

      // Hard-delete sensitive data that has no legitimate retention basis.
      await tx.sellerKyc.deleteMany({ where: { sellerId } });
      await tx.sellerSocialLinks.deleteMany({ where: { sellerId } });

      // Soft-delete all listings so they disappear from the marketplace.
      await tx.listing.updateMany({
        where: { sellerId, deletedAt: null },
        data: { deletedAt: new Date(), status: "ARCHIVED" },
      });
    }
  });

  // Best-effort storage cleanup — non-fatal if it fails.
  try {
    const supabase = createServiceClient();
    const { data: files } = await supabase.storage.from("avatars").list(supabaseId);
    if (files && files.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(files.map((f) => `${supabaseId}/${f.name}`));
    }
  } catch {
    console.warn("[gdpr] avatar storage cleanup failed (non-fatal)");
  }

  // Delete the Supabase auth user last — after the DB is fully committed.
  // If this fails, the DB is already anonymised; an admin can remove the stale
  // auth entry manually.
  const { error } = await createServiceClient().auth.admin.deleteUser(supabaseId);
  if (error) {
    console.error("[gdpr] Supabase auth user deletion failed:", error.message);
  }
}
