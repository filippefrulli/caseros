"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
};

type ThreadData = {
  messages: Message[];
  currentUserId: string;
};

export function MessageThread({
  conversationId,
  initialData,
  otherPartyName,
}: {
  conversationId: string;
  initialData: ThreadData;
  otherPartyName: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data } = useQuery<ThreadData>({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${conversationId}`);
      return res.json();
    },
    initialData,
    staleTime: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const messages = data?.messages ?? [];
  const currentUserId = data?.currentUserId ?? initialData.currentUserId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4">
        <Link
          href="/messages"
          className="flex items-center justify-center rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors md:hidden"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
          {otherPartyName.charAt(0).toUpperCase()}
        </div>
        <p className="font-semibold text-gray-900">{otherPartyName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          {messages.length === 0 && (
            <p className="mt-8 text-center text-sm text-gray-400">
              Start the conversation by sending a message.
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isOwn ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-end gap-2 border-t border-gray-100 px-4 py-3"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
