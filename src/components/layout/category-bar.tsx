import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function CategoryBar() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  if (categories.length === 0) return null;

  return (
    <div className="border-b border-border bg-bg-page">
      <div className="mx-auto flex max-w-6xl items-center gap-0.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
