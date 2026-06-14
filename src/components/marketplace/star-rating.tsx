import { Star } from "lucide-react";

export function StarRating({ rating, max = 5, size = 16 }: { rating: number; max?: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? "fill-gold text-gold" : "fill-border-strong text-text-muted"}
        />
      ))}
    </span>
  );
}
