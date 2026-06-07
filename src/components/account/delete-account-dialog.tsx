"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteAccountDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function open() {
    setConfirmed(false);
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      dialogRef.current?.close();
      router.push("/?account=deleted");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-2 rounded-lg border border-error/30 px-4 py-2.5 text-sm font-medium text-error hover:bg-error-subtle transition-colors"
      >
        <Trash2 size={15} />
        Delete account
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 w-full max-w-sm rounded-xl border border-border bg-bg-card p-6 shadow-float backdrop:bg-black/40"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <h2 className="text-base font-semibold text-text-primary">Delete your account?</h2>

        <p className="mt-2 text-sm text-text-secondary">
          Your personal data (name, email, profile picture) will be permanently erased.
        </p>

        <ul className="mt-3 space-y-1 text-sm text-text-secondary">
          <li className="flex gap-2"><span className="text-error">✕</span> Profile and personal info</li>
          <li className="flex gap-2"><span className="text-error">✕</span> Saved addresses and favourites</li>
          <li className="flex gap-2"><span className="text-text-muted">↓</span> Order history kept (required by law)</li>
          <li className="flex gap-2"><span className="text-text-muted">↓</span> Reviews kept (anonymised)</li>
        </ul>

        <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-error cursor-pointer"
          />
          <span className="text-sm text-text-secondary">
            I understand this is permanent and cannot be undone.
          </span>
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-error-subtle px-3 py-2 text-sm text-error">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!confirmed || loading}
            className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </dialog>
    </>
  );
}
