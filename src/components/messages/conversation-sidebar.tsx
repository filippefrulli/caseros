import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export async function ConversationSidebar({ activeId }: { activeId?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, seller: { select: { id: true } } },
  });
  if (!dbUser) return null;

  const orClauses = [
    { buyerId: dbUser.id },
    ...(dbUser.seller ? [{ sellerId: dbUser.seller.id }] : []),
  ];

  const conversations = await prisma.conversation.findMany({
    where: { OR: orClauses },
    orderBy: { lastMessageAt: "desc" },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, shopName: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-center text-sm text-text-muted">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => {
        const isBuyer = conv.buyerId === dbUser.id;
        const otherName = isBuyer
          ? conv.seller.shopName
          : (conv.buyer.name ?? conv.buyer.email);
        const lastMsg = conv.messages[0];
        const myCursor = isBuyer ? conv.buyerLastReadAt : conv.sellerLastReadAt;
        // Unread if the other side has spoken since I last read. After I send
        // a message my cursor is bumped, so my own messages never look unread.
        const unread =
          lastMsg &&
          lastMsg.senderId !== dbUser.id &&
          (!myCursor || lastMsg.createdAt > myCursor)
            ? 1
            : 0;
        const isActive = conv.id === activeId;

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-subtle ${isActive ? "bg-bg-subtle" : ""}`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-text-secondary">
              {otherName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className={`truncate text-sm ${unread > 0 ? "font-semibold text-text-primary" : "font-medium text-text-secondary"}`}>
                  {otherName}
                </p>
                {lastMsg && (
                  <p className="shrink-0 text-xs text-text-muted">
                    {new Date(lastMsg.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
              {lastMsg && (
                <p className={`truncate text-xs ${unread > 0 ? "text-text-secondary" : "text-text-muted"}`}>
                  {lastMsg.senderId === dbUser.id ? "You: " : ""}{lastMsg.body}
                </p>
              )}
            </div>
            {unread > 0 && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-error" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
