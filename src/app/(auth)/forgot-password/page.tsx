import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const linkExpired = error === "link_expired";

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
          <h1 className="text-xl font-bold text-text-primary">Forgot password?</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {linkExpired && (
            <p className="mt-4 rounded-lg bg-error-subtle px-4 py-3 text-sm text-error">
              That reset link has expired. Enter your email below to request a new one.
            </p>
          )}

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          Remember it?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
