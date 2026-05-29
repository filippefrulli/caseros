import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { seller: true },
  });

  if (!dbUser?.seller) {
    return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
  }

  const { seller } = dbUser;

  if (seller.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not approved" }, { status: 403 });
  }

  let stripeAccountId = seller.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.v2.core.accounts.create({
      contact_email: user.email,
      dashboard: "express",
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      identity: {
        country: seller.country ?? undefined,
      },
      metadata: { sellerId: seller.id },
    });

    stripeAccountId = account.id;

    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { stripeAccountId },
    });
  }

  const accountLink = await stripe.v2.core.accountLinks.create({
    account: stripeAccountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${env.NEXT_PUBLIC_APP_URL}/seller/stripe/refresh`,
        return_url: `${env.NEXT_PUBLIC_APP_URL}/seller/stripe/return`,
      },
    },
  });

  return NextResponse.json({ url: accountLink.url });
}
