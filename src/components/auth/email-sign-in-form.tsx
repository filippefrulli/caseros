"use client";

import { useActionState, useState } from "react";
import { signInWithEmail, type AuthActionState } from "@/lib/actions/auth";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function EmailSignInForm({ next }: { next: string }) {
  const [state, action, isPending] = useActionState<AuthActionState, FormData>(
    signInWithEmail,
    null,
  );
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state?.error && (
        <p className="rounded-lg bg-error-subtle px-4 py-3 text-sm text-error">{state.error}</p>
      )}

      <div>
        <label htmlFor="si-email" className="block text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="si-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-xs text-error">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="si-password" className="block text-sm font-medium text-text-primary">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1">
          <input
            id="si-password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="block w-full rounded-lg border border-border bg-bg-subtle px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-text-secondary"
            tabIndex={-1}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p className="mt-1 text-xs text-error">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-btn-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-btn-primary-hover disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
