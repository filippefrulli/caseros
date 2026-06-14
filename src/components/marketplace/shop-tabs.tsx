"use client";

import { useState } from "react";

type Tab = "listings" | "reviews" | "about";

export function ShopTabs({
  listingsContent,
  aboutContent,
  reviewsContent,
  reviewCount,
}: {
  listingsContent: React.ReactNode;
  aboutContent: React.ReactNode;
  reviewsContent: React.ReactNode;
  reviewCount: number;
}) {
  const [active, setActive] = useState<Tab>("listings");

  const tabs: { key: Tab; label: string }[] = [
    { key: "listings", label: "Listings" },
    { key: "reviews", label: reviewCount > 0 ? `Reviews (${reviewCount})` : "Reviews" },
    { key: "about", label: "About" },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-border">
        <div className="flex gap-8">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`-mb-px pb-3 text-sm font-medium border-b-2 transition-colors ${
                active === key
                  ? "border-border-strong text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={active !== "listings" ? "hidden" : ""}>{listingsContent}</div>
      <div className={active !== "reviews" ? "hidden" : ""}>{reviewsContent}</div>
      <div className={active !== "about" ? "hidden" : ""}>{aboutContent}</div>
    </div>
  );
}
