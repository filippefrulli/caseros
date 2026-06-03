import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, seller: { select: { id: true } } },
  });
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { buyerId: true, sellerId: true },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isBuyer = conversation.buyerId === dbUser.id;
  const isSeller = dbUser.seller && conversation.sellerId === dbUser.seller.id;
  if (!isBuyer && !isSeller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.conversation.update({
    where: { id },
    data: isBuyer ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
