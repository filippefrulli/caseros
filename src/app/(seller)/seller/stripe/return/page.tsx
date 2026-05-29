import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

export default async function StripeReturnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { seller: true },
  });

  if (!dbUser?.seller?.stripeAccountId) redirect("/seller/dashboard");

  const account = await stripe.v2.core.accounts.retrieve(
    dbUser.seller.stripeAccountId,
    { include: ["configuration.recipient"] },
  );

  const transfersStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status;
  const payoutsEnabled = transfersStatus === "active";

  await prisma.sellerProfile.update({
    where: { id: dbUser.seller.id },
    data: {
      stripeOnboardingDone: true,
      payoutsEnabled,
    },
  });

  redirect("/seller/dashboard");
}
