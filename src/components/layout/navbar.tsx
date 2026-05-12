import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = user?.user_metadata?.full_name as string | undefined;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-75 transition-opacity"
        >
          <Home size={18} />
          Artcraft
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/account"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name ?? "Profile"}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                    {name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                <span className="hidden sm:inline">{name ?? user.email}</span>
              </Link>
              <SignOutButton />
            </>
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
