"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Suspense } from "react";

function SearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
    if (!value) { router.push("/"); return; }
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value === "") router.push("/");
  }

  return (
    <form key={q} onSubmit={handleSubmit} className="flex w-full rounded-full border border-border bg-bg-subtle focus-within:border-border-strong focus-within:bg-bg-card transition-colors p-1">
      <div className="flex flex-1 items-center">
        <Search size={14} className="pointer-events-none ml-2 shrink-0 text-text-muted" />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search listings…"
          onChange={handleChange}
          className="min-w-0 flex-1 bg-transparent py-1 pl-2 pr-1 text-sm placeholder:text-text-muted focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        Search
      </button>
    </form>
  );
}

const fallback = (
  <div className="flex w-full rounded-full border border-border bg-bg-subtle p-1">
    <div className="flex flex-1 items-center">
      <Search size={14} className="ml-2 shrink-0 text-text-muted" />
      <div className="flex-1 py-1 pl-2 pr-1 text-sm text-text-muted">Search listings…</div>
    </div>
    <div className="rounded-full bg-gray-900 px-4 text-sm font-medium text-white flex items-center">Search</div>
  </div>
);

export function SearchBar() {
  return <Suspense fallback={fallback}><SearchInput /></Suspense>;
}
