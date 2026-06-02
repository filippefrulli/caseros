import { Navbar } from "@/components/layout/navbar";
import { CategoryBar } from "@/components/layout/category-bar";
import { Footer } from "@/components/layout/footer";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <CategoryBar />
      <div className="flex-1 w-full">{children}</div>
      <Footer />
    </>
  );
}
