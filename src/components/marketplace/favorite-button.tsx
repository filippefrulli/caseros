"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/lib/actions/user";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { track } from "@vercel/analytics";

type Props = {
  listingId: string;
  isFavorited: boolean;
  isLoggedIn: boolean;
  className?: string;
  iconSize?: number;
};

export function FavoriteButton({
  listingId,
  isFavorited,
  isLoggedIn,
  className = "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition hover:bg-white",
  iconSize = 15,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticFav, setOptimisticFav] = useOptimistic(isFavorited);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      setOptimisticFav(!optimisticFav);
      if (!optimisticFav) track("listing_saved");
      await toggleFavorite(listingId);
    });
  };

  return (
    <button
      type="button"
      aria-label={optimisticFav ? "Remove from saved" : "Save"}
      onClick={handleClick}
      className={className}
    >
      <Heart
        size={iconSize}
        className={
          optimisticFav
            ? "fill-red-500 text-red-500"
            : "text-gray-600 transition group-hover/card:text-gray-800"
        }
      />
    </button>
  );
}
