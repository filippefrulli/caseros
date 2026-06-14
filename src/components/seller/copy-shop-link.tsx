"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function CopyShopLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/shop/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors"
      >
        {copied ? <Check size={15} /> : <Share2 size={15} />}
        {copied ? "Copied!" : "Share shop"}
      </button>

      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-btn-neutral px-4 py-2.5 text-sm text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
          Link copied to clipboard
        </div>
      )}
    </>
  );
}
