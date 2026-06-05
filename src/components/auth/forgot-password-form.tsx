"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";

const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    null,
  );

  if (state?.success) {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        {state.success}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-error-subtle px-4 py-3 text-sm text-error">{state.error}</p>
      )}

      <div>
        <label htmlFor="fp-email" className="block text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="fp-email"
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

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
