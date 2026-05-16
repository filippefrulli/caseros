"use client";

import { useState } from "react";

type Tab = "listings" | "about";

export function ShopTabs({
  listingsContent,
  aboutContent,
}: {
  listingsContent: React.ReactNode;
  aboutContent: React.ReactNode;
}) {
  const [active, setActive] = useState<Tab>("listings");

  return (
    <div>
      <div className="mb-8 border-b border-gray-200">
        <div className="flex gap-8">
          {(["listings", "about"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`-mb-px pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                active === tab
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "listings" ? "Listings" : "About"}
            </button>
          ))}
        </div>
      </div>

      <div className={active !== "listings" ? "hidden" : ""}>{listingsContent}</div>
      <div className={active !== "about" ? "hidden" : ""}>{aboutContent}</div>
    </div>
  );
}
