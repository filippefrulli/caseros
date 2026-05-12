"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

type ImageItem = { url: string; altText: string | null };

type Props = {
  images: ImageItem[];
  title: string;
};

export function ListingImageCarousel({ images, title }: Props) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
        <Package size={64} strokeWidth={1} />
      </div>
    );
  }

  const current = images[selected] ?? images[0];

  return (
    <div className="flex gap-3">
      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex w-[72px] shrink-0 flex-col gap-2 overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === selected
                  ? "border-gray-900"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? title}
                fill
                className="object-cover"
                sizes="72px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-gray-100">
        <Image
          src={current.url}
          alt={current.altText ?? title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </div>
  );
}
