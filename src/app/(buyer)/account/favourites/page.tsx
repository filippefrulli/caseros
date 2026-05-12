import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Saved Items" };

export default function FavouritesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-900">
          ← Account
        </Link>
        <h1 className="text-2xl font-bold">Saved Items</h1>
      </div>
      <p className="text-gray-500">You have no saved items yet.</p>
    </main>
  );
}
