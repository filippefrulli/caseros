"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview, type ReviewState } from "@/lib/actions/review";

export function ReviewForm({ sellerId }: { sellerId: string }) {
  const [state, action, isPending] = useActionState<ReviewState, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Thank you! Your review has been submitted.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="sellerId" value={sellerId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={28}
                className={
                  star <= (hovered || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-border-strong text-text-muted"
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Comment <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={2000}
          placeholder="Share your experience with this item and seller…"
          className="block w-full rounded-lg border border-border-strong px-3 py-2 text-sm shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="rounded-lg bg-btn-neutral px-5 py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:opacity-50 transition-colors"
      >
        {isPending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
