"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function ChatIcon({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/messages"
      className="relative flex items-center justify-center rounded-md p-2 text-text-secondary hover:bg-bg-subtle hover:text-text-primary transition-colors"
      aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : "Messages"}
    >
      <MessageCircle size={20} />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
      )}
    </Link>
  );
}
