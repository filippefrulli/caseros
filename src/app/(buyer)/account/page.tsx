import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Account" };

export default function AccountPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">My Account</h1>
      {/* Account content — to be implemented */}
    </main>
  );
}
