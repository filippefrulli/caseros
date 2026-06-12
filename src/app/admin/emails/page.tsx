import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/env";
import { EmailTester } from "@/components/admin/email-tester";

export const metadata: Metadata = { title: "Admin — Email tester" };

export default async function AdminEmailsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email tester</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send each transactional email with sample data to verify delivery. Each send uses a fresh
          order id so it isn&apos;t deduplicated as a repeat.
        </p>
      </div>

      <EmailTester defaultTo={user.email ?? env.ADMIN_EMAIL ?? ""} />
    </main>
  );
}
