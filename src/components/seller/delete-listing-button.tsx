"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteListing } from "@/lib/actions/listing";

type Props = { listingId: string; listingTitle: string };

export function DeleteListingButton({ listingId, listingTitle }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function confirm() {
    startTransition(async () => {
      const result = await deleteListing(listingId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={open}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 transition-colors py-2 px-1"
        aria-label={`Delete ${listingTitle}`}
      >
        <Trash2 size={13} />
        Delete
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 rounded-xl border border-gray-200 p-6 shadow-xl backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
      >
        <h2 className="text-base font-semibold text-gray-900">Delete listing?</h2>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{listingTitle}</span> will be permanently deleted — including all its photos and videos. This cannot be undone.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </dialog>
    </>
  );
}
