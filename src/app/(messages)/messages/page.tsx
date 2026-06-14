import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationSidebar } from "@/components/messages/conversation-sidebar";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  return (
    <>
      {/* Mobile: full conversation list */}
      <div className="flex flex-col md:hidden">
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h1 className="text-base font-semibold text-text-primary">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationSidebar />
        </div>
      </div>

      {/* Desktop: empty state */}
      <div className="hidden flex-1 flex-col items-center justify-center gap-3 md:flex">
        <MessageCircle size={32} className="text-text-muted" />
        <p className="text-sm text-text-muted">Select a conversation</p>
      </div>
    </>
  );
}
