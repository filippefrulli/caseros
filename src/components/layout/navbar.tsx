import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "./user-menu";
import Link from "next/link";
import { Home } from "lucide-react";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = user?.user_metadata?.full_name as string | undefined;

  const isSeller = user
    ? !!(await prisma.sellerProfile.findFirst({ where: { user: { supabaseId: user.id } }, select: { id: true } }))
    : false;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-75 transition-opacity"
        >
          <Home size={18} />
          Caseros
        </Link>

        <nav className="flex items-center">
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
