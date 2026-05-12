import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "New Listing" };

export default function NewListingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">New listing</h1>
      </div>
      <p className="text-gray-500">Listing creation coming soon.</p>
    </main>
  );
}
