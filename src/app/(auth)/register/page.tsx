import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmailSignUpForm } from "@/components/auth/email-sign-up-form";


export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/" } = await searchParams;

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
          <h1 className="text-xl font-bold text-text-primary">Create account</h1>
          <p className="mt-1 text-sm text-text-secondary">Join the Caseros community</p>

          <div className="mt-6 space-y-5">
            <EmailSignUpForm />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <GoogleSignInButton />

            <p className="text-center text-xs text-text-muted">
              By continuing with Google, you agree to our{" "}
              <Link href="/legal/terms" className="underline hover:text-text-secondary transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="underline hover:text-text-secondary transition-colors">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{" "}
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
