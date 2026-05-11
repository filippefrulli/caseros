import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-4xl font-bold">Artcraft Marketplace</h1>
      <p className="text-muted-foreground text-lg text-center max-w-md">
        Discover unique handmade and craft goods from European artisans.
      </p>
    </main>
  );
}
