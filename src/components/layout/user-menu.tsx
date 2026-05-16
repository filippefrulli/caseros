"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, ShoppingBag, Heart, Store, Plus, LogOut, X } from "lucide-react";

interface UserMenuProps {
  avatarUrl?: string;
  name?: string;
  email?: string;
  isSeller?: boolean;
}

export function UserMenu({ avatarUrl, name, email, isSeller }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const initials = name?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";

  const overlay = (
    <>
      {/* Backdrop — portalled to body so backdrop-blur on header doesn't trap it */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="User menu"
        className={`fixed right-0 top-0 z-50 flex h-screen w-72 flex-col bg-white shadow-xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name ?? "Profile"}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 select-none">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              {name && <p className="truncate text-sm font-semibold text-gray-900">{name}</p>}
              {email && <p className="truncate text-xs text-gray-500">{email}</p>}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex flex-col gap-1 px-3 py-4">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <User size={16} className="shrink-0 text-gray-400" />
            Profile
          </Link>
          <Link
            href="/account/orders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ShoppingBag size={16} className="shrink-0 text-gray-400" />
            My orders
          </Link>
          <Link
            href="/account/favourites"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Heart size={16} className="shrink-0 text-gray-400" />
            Favourites
          </Link>
          {isSeller ? (
            <Link
              href="/seller/listings/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors mt-1"
            >
              <Plus size={16} className="shrink-0" />
              Add a new listing
            </Link>
          ) : (
            <Link
              href="/seller/onboarding"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors mt-1"
            >
              <Store size={16} className="shrink-0" />
              Become a seller
            </Link>
          )}
        </nav>

        {/* Sign out pinned at bottom */}
        <div className="mt-auto border-t border-gray-100 px-3 py-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Avatar button — stays inside the navbar */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open user menu"
        className="flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name ?? "Profile"}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 select-none">
            {initials}
          </span>
        )}
      </button>

      {/* Portal renders backdrop + panel at <body> level, outside the header's stacking context */}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
