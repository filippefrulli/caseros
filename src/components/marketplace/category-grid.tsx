import Link from "next/link";
import {
  Gem, Palette, Home, Shirt, Coffee,
  BookOpen, Sparkles, Scissors, ShoppingBag,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

type IconComponent = React.ComponentType<LucideProps>;

const ICONS: Record<string, IconComponent> = {
  "jewelry":            Gem,
  "prints-digital-art": Palette,
  "home-decor":         Home,
  "clothing-knitwear":  Shirt,
  "ceramics-pottery":   Coffee,
  "stationery-paper":   BookOpen,
  "bath-beauty":        Sparkles,
  "embroidery":         Scissors,
};

type Category = { id: string; name: string; slug: string };

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="mb-12">
      <h2 className="mb-5 text-lg font-bold text-text-primary">Browse by category</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat) => {
          const Icon: IconComponent = ICONS[cat.slug] ?? ShoppingBag;
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center gap-3 rounded-xl bg-bg-card px-3 py-5 shadow-card transition-shadow hover:shadow-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-accent transition-colors group-hover:bg-accent group-hover:text-accent-fg">
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <span className="text-center text-sm font-medium leading-tight text-text-primary">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
