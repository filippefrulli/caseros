import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "./user-menu";
import { SearchBar } from "./search-bar";
import { ChatIcon } from "@/components/messages/chat-icon";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import Link from "next/link";
import Image from "next/image";
import { CountryPicker } from "@/components/marketplace/country-picker";
import { getVisitorCountry } from "@/lib/visitor-country";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const visitorCountry = await getVisitorCountry();

  const name = user?.user_metadata?.full_name as string | undefined;

  const dbUser = user
    ? await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, avatarUrl: true, seller: { select: { id: true } } },
      })
    : null;

  const avatarUrl = dbUser?.avatarUrl ?? (user?.user_metadata?.avatar_url as string | undefined);
  const isSeller = !!dbUser?.seller;

  // Count conversations where the other side has spoken since I last read.
  // Bumping the sender's cursor on message-create means my own messages
  // never count as unread.
  const unreadCount = dbUser
    ? await prisma.conversation.count({
        where: {
          OR: [
            {
              buyerId: dbUser.id,
              OR: [
                { buyerLastReadAt: null },
                { lastMessageAt: { gt: prisma.conversation.fields.buyerLastReadAt } },
              ],
            },
            ...(dbUser.seller
              ? [
                  {
                    sellerId: dbUser.seller.id,
                    OR: [
                      { sellerLastReadAt: null },
                      { lastMessageAt: { gt: prisma.conversation.fields.sellerLastReadAt } },
                    ],
                  },
                ]
              : []),
          ],
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
      <div className="mx-auto max-w-6xl px-4">
        {/* Main row */}
        <div className="flex h-14 items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-display text-xl font-semibold tracking-tight hover:opacity-75 transition-opacity"
          >
            <Image src="/logo.png" alt="Caseros" width={24} height={24} priority className="rounded-sm" />
            Caseros
          </Link>

          {/* Search bar, hidden on mobile, centered on sm+ */}
          <div className="hidden flex-1 sm:flex sm:justify-center">
            <div className="w-full max-w-lg">
              <SearchBar />
            </div>
          </div>

          <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
            <CountryPicker current={visitorCountry} />
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
                className="rounded-md bg-btn-neutral px-3.5 py-1.5 text-sm font-medium text-btn-neutral-fg hover:bg-btn-neutral-hover transition-colors"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>

        {/* Mobile-only search bar row */}
        <div className="pb-3 sm:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
