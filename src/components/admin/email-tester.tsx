"use client";

import { useState } from "react";
import { Loader2, Check, AlertCircle, Send } from "lucide-react";
import { TEST_EMAIL_TEMPLATES, type TestEmailKey } from "@/lib/test-emails";

type Status = "idle" | "sending" | "sent" | "error";

const audienceBadge: Record<string, string> = {
  buyer: "bg-blue-50 text-blue-700",
  seller: "bg-emerald-50 text-emerald-700",
  admin: "bg-amber-50 text-amber-700",
};

export function EmailTester({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function send(key: TestEmailKey) {
    setStatuses((s) => ({ ...s, [key]: "sending" }));
    setErrors((e) => ({ ...e, [key]: "" }));
    try {
      const res = await fetch("/api/admin/test-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: key, to }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Send failed.");
      }
      setStatuses((s) => ({ ...s, [key]: "sent" }));
    } catch (err) {
      setStatuses((s) => ({ ...s, [key]: "error" }));
      setErrors((e) => ({ ...e, [key]: err instanceof Error ? err.message : "Send failed." }));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="test-email-to" className="block text-sm font-medium text-text-secondary">
          Recipient
        </label>
        <input
          id="test-email-to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1 block w-full max-w-md rounded-lg border border-border-strong px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <p className="mt-1 text-xs text-text-secondary">
          Buyer/seller emails go here. Admin emails always go to{" "}
          <code className="rounded bg-bg-subtle px-1">ADMIN_EMAIL</code> regardless. In Resend sandbox
          mode delivery is limited to the account owner&apos;s address.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-bg-card">
        {TEST_EMAIL_TEMPLATES.map((t) => {
          const status = statuses[t.key] ?? "idle";
          return (
            <li key={t.key} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{t.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${audienceBadge[t.audience]}`}>
                    {t.audience}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-text-secondary">{t.description}</p>
                {status === "error" && errors[t.key] && (
                  <p className="mt-1 text-xs text-error">{errors[t.key]}</p>
                )}
              </div>
              <button
                onClick={() => send(t.key)}
                disabled={status === "sending" || !to}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-btn-neutral px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-btn-neutral-hover disabled:opacity-50"
              >
                {status === "sending" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : status === "sent" ? (
                  <Check size={14} />
                ) : status === "error" ? (
                  <AlertCircle size={14} />
                ) : (
                  <Send size={14} />
                )}
                {status === "sending" ? "Sending…" : status === "sent" ? "Sent" : status === "error" ? "Retry" : "Send"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
