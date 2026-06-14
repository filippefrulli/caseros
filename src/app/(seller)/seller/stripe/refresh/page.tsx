"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StripeRefreshPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/seller/stripe/connect", { method: "POST" })
      .then((res) => res.json())
      .then(({ url }: { url?: string }) => {
        if (url) window.location.assign(url);
        else router.push("/seller/dashboard");
      })
      .catch(() => router.push("/seller/dashboard"));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-text-secondary">Resuming setup…</p>
    </main>
  );
}
