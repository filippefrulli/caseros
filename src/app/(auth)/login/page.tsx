import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/" } = await searchParams;

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
          <h1 className="text-xl font-bold text-text-primary">Welcome back</h1>
          <p className="mt-1 text-sm text-text-secondary">Sign in to your account</p>

          <div className="mt-6 space-y-5">
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error === "missing_code"
                  ? "Sign-in failed. Please try again."
                  : error === "auth_failed"
                    ? "Authentication failed. Please try again."
                    : "Something went wrong. Please try again."}
              </p>
            )}

            <EmailSignInForm next={next} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <GoogleSignInButton />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Create one
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-text-muted">
          Trouble signing in?{" "}
          <Link href="/legal/support" className="underline hover:text-text-secondary transition-colors">
            Contact support
          </Link>
        </p>
      </div>
    </main>
  );
}
