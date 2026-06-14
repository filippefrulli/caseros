"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function StartConversationButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId }),
      });
      if (res.ok) {
        const { id } = await res.json();
        router.push(`/messages/${id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors disabled:opacity-50"
    >
      <MessageCircle size={15} />
      {loading ? "Opening…" : "Message seller"}
    </button>
  );
}
