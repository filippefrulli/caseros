import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "./user-menu";
import { SearchBar } from "./search-bar";
import { ChatIcon } from "@/components/messages/chat-icon";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import Link from "next/link";
import { Home } from "lucide-react";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = user?.user_metadata?.full_name as string | undefined;

  const dbUser = user
    ? await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, seller: { select: { id: true } } },
      })
    : null;

  const isSeller = !!dbUser?.seller;

  const unreadCount = dbUser
    ? await prisma.message.count({
        where: {
          readAt: null,
          senderId: { not: dbUser.id },
          conversation: {
            OR: [
              { buyerId: dbUser.id },
              ...(dbUser.seller ? [{ sellerId: dbUser.seller.id }] : []),
            ],
          },
        },
      })
    : 0;

  const [notifications, unreadNotificationCount] = dbUser
    ? await Promise.all([
        prisma.notification.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            entityType: true,
            entityId: true,
            readAt: true,
            createdAt: true,
          },
        }),
        prisma.notification.count({
          where: { userId: dbUser.id, readAt: null },
        }),
      ])
    : [[], 0];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-page/90 backdrop-blur-sm">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-3 items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-75 transition-opacity"
        >
          <Home size={18} />
          Caseros
        </Link>

        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            <SearchBar />
          </div>
        </div>

        <nav className="flex items-center justify-end gap-1">
          {user && <ChatIcon unreadCount={unreadCount} />}
          {user && (
            <NotificationsBell
              notifications={notifications}
              unreadCount={unreadNotificationCount}
            />
          )}
          {user ? (
            <UserMenu
              avatarUrl={avatarUrl}
              name={name}
              email={user.email}
              isSeller={isSeller}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-gray-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
