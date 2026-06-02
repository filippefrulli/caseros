"use client";

import { useActionState, useState } from "react";
import { signUpWithEmail, type AuthActionState } from "@/lib/actions/auth";
import { Eye, EyeOff, MailCheck } from "lucide-react";

const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function EmailSignUpForm() {
  const [state, action, isPending] = useActionState<AuthActionState, FormData>(
    signUpWithEmail,
    null,
  );
  const [showPw, setShowPw] = useState(false);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-accent-subtle px-6 py-8 text-center">
        <MailCheck size={36} className="text-accent" strokeWidth={1.5} />
        <div>
          <p className="font-semibold text-text-primary">Check your inbox</p>
          <p className="mt-1 text-sm text-text-secondary">{state.success}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="su-email" className="block text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="su-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="su-password" className="block text-sm font-medium text-text-primary">
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="su-password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Min. 8 characters"
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
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
