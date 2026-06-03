import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MessageThread } from "@/components/messages/message-thread";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Conversation" };

type Props = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/${id}`);

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, seller: { select: { id: true } } },
  });
  if (!dbUser) redirect(`/login?next=/messages/${id}`);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, shopName: true, user: { select: { id: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, senderId: true, createdAt: true },
      },
    },
  });

  if (!conversation) notFound();

  const isBuyer = conversation.buyerId === dbUser.id;
  const isSeller = dbUser.seller && conversation.sellerId === dbUser.seller.id;
  if (!isBuyer && !isSeller) notFound();

  await prisma.conversation.update({
    where: { id },
    data: isBuyer ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
  });

  const otherPartyName = isBuyer
    ? conversation.seller.shopName
    : (conversation.buyer.name ?? conversation.buyer.email);

  const initialData = {
    messages: conversation.messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    currentUserId: dbUser.id,
  };

  return (
    <MessageThread
      conversationId={id}
      initialData={initialData}
      otherPartyName={otherPartyName}
    />
  );
}
