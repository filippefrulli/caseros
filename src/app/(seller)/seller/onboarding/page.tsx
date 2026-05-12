import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/seller/onboarding-form";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Open your shop" };

export default async function SellerOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/onboarding");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { seller: true },
  });

  // Already onboarded — skip straight to dashboard
  if (dbUser?.seller) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold">Open your shop</h1>
        <p className="text-sm text-gray-500">
          Set up your seller profile to start listing your work.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
