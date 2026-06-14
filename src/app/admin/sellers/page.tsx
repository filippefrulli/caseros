import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SellerActions } from "@/components/admin/seller-actions";
import { SetCommissionButton } from "@/components/admin/set-commission-button";
import { MapPin, CalendarDays, ExternalLink } from "lucide-react";
import { env } from "@/env";

const PLATFORMS = ["website", "instagram", "tiktok", "youtube", "facebook", "twitter", "pinterest", "linkedin"] as const;

export default async function AdminSellersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  // Cap unbounded queries, replace with paginated UI when these tables grow.
  const SELLERS_CAP = 100;
  const [sellers, activeSellers] = await Promise.all([
    prisma.sellerProfile.findMany({
      where: { status: { in: ["PENDING", "REJECTED"] }, user: { deletedAt: null } },
      include: {
        kyc: true,
        socialLinks: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "asc" },
      take: SELLERS_CAP,
    }),
    prisma.sellerProfile.findMany({
      where: { status: "ACTIVE", user: { deletedAt: null } },
      select: {
        id: true,
        shopName: true,
        country: true,
        commissionRate: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "asc" },
      take: SELLERS_CAP,
    }),
  ]);

  // Generate signed URLs for all verification videos (1-hour expiry)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  const signedVideoUrls = new Map<string, string>();
  await Promise.all(
    sellers
      .filter(s => s.kyc?.verificationVideoUrl)
      .map(async s => {
        const path = s.kyc!.verificationVideoUrl!;
        const { data } = await serviceClient.storage
          .from("seller-verification")
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) signedVideoUrls.set(s.id, data.signedUrl);
      }),
  );

  const countryFmt = new Intl.DisplayNames(["en"], { type: "region" });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Seller Review</h1>
        <p className="mt-1 text-sm text-text-secondary">{sellers.length} seller{sellers.length === 1 ? "" : "s"} pending review</p>
      </div>

      {sellers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-text-muted">No sellers pending review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sellers.map(seller => {
            const kyc = seller.kyc;
            const socials = seller.socialLinks;
            const activeSocials = socials
              ? PLATFORMS.filter(p => !!socials[p]).map(p => ({ platform: p, url: socials[p] as string }))
              : [];

            return (
              <div key={seller.id} className="rounded-xl border border-border bg-bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{seller.shopName}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        seller.status === "REJECTED"
                          ? "bg-error-subtle text-error"
                          : "bg-warning text-warning-fg"
                      }`}>
                        {seller.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">{seller.user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <MapPin size={12} />
                        {countryFmt.of(seller.country) ?? seller.country}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <CalendarDays size={12} />
                        Applied {seller.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="text-xs text-text-muted">
                        {kyc?.sellerType === "INDIVIDUAL" ? "Individual" : "Trader"}
                      </span>
                    </div>
                  </div>

                  <SellerActions sellerId={seller.id} />
                </div>

                {/* Verification video */}
                {kyc?.verificationVideoUrl && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Verification video</p>
                    {signedVideoUrls.has(seller.id) ? (
                      <video
                        src={signedVideoUrls.get(seller.id)}
                        controls
                        className="w-full max-w-lg rounded-lg border border-border bg-black"
                        style={{ maxHeight: "280px" }}
                      />
                    ) : (
                      <p className="text-xs text-text-muted">Video unavailable</p>
                    )}
                  </div>
                )}

                {/* Social links */}
                {activeSocials.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Social links</p>
                    <div className="flex flex-wrap gap-2">
                      {activeSocials.map(({ platform, url }) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors capitalize"
                        >
                          {platform}
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* KYC denial notes */}
                {kyc?.reviewNotes && (
                  <div className="mt-4 rounded-lg bg-error-subtle px-3 py-2 text-xs text-error">
                    <span className="font-medium">Previous denial note:</span> {kyc.reviewNotes}
                  </div>
                )}

                {/* KYC summary */}
                {kyc && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-text-muted hover:text-text-secondary">Show KYC details</summary>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-secondary">
                      {kyc.fullName && <><span className="text-text-muted">Name</span><span>{kyc.fullName}</span></>}
                      {kyc.dateOfBirth && <><span className="text-text-muted">DOB</span><span>{kyc.dateOfBirth.toLocaleDateString("en-GB")}</span></>}
                      {kyc.addressLine1 && <><span className="text-text-muted">Address</span><span>{[kyc.addressLine1, kyc.city, kyc.postalCode].filter(Boolean).join(", ")}</span></>}
                      {kyc.businessRegNumber && <><span className="text-text-muted">Reg. no.</span><span>{kyc.businessRegNumber}</span></>}
                      {kyc.contactEmail && <><span className="text-text-muted">Contact email</span><span>{kyc.contactEmail}</span></>}
                      {kyc.contactPhone && <><span className="text-text-muted">Contact phone</span><span>{kyc.contactPhone}</span></>}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active sellers, commission management */}
      {activeSellers.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-4 text-lg font-semibold">Active sellers</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Shop</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Country</th>
                  <th className="px-4 py-3 text-left font-medium">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeSellers.map(s => (
                  <tr key={s.id} className="hover:bg-bg-subtle">
                    <td className="px-4 py-3 font-medium text-text-primary">{s.shopName}</td>
                    <td className="px-4 py-3 text-text-secondary">{s.user.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{countryFmt.of(s.country) ?? s.country}</td>
                    <td className="px-4 py-3">
                      <SetCommissionButton
                        sellerId={s.id}
                        current={Number(s.commissionRate)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
