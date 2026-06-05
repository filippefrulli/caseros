import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Set new password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/forgot-password");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-xl font-bold tracking-tight text-text-primary hover:opacity-75 transition-opacity"
        >
          <Home size={20} />
          Caseros
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-bg-card p-8">
          <h1 className="text-xl font-bold text-text-primary">Set new password</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose a password with at least 8 characters.</p>

          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
