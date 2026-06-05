"use client";

import { useActionState, useState } from "react";
import { updatePassword, type AuthActionState } from "@/lib/actions/auth";
import { Eye, EyeOff } from "lucide-react";

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState<AuthActionState, FormData>(
    updatePassword,
    null,
  );
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="rp-password" className="block text-sm font-medium text-text-primary">
          New password
        </label>
        <div className="relative mt-1">
          <input
            id="rp-password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
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
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
