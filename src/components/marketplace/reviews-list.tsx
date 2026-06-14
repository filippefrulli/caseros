import { StarRating } from "./star-rating";

type Review = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  author: { name: string | null };
};

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-text-muted">No reviews yet.</p>;
  }

  return (
    <ul className="space-y-5">
      {reviews.map((r) => (
        <li key={r.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StarRating rating={r.rating} size={14} />
              <span className="text-sm font-medium text-text-primary">
                {r.author.name ?? "Anonymous"}
              </span>
            </div>
            <span className="shrink-0 text-xs text-text-muted">{DATE_FMT.format(r.createdAt)}</span>
          </div>
          {r.body && (
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{r.body}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
