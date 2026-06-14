import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { LabelCreationToggle } from "@/components/admin/label-creation-toggle";
import { IntegratedShippingToggle } from "@/components/admin/integrated-shipping-toggle";

export const metadata: Metadata = { title: "Admin: Settings" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  const settings = await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Platform settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Shipping</h2>
        <IntegratedShippingToggle enabled={settings.integratedShippingEnabled} />
        {settings.integratedShippingEnabled && (
          <LabelCreationToggle enabled={settings.labelCreationEnabled} />
        )}
      </section>
    </main>
  );
}
