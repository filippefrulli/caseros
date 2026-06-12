import { Navbar } from "@/components/layout/navbar";
import { CategoryBar } from "@/components/layout/category-bar";
import { Footer } from "@/components/layout/footer";
import { CountryPicker } from "@/components/marketplace/country-picker";
import { getVisitorCountry, hasChosenCountry } from "@/lib/visitor-country";

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const [current, chosen] = await Promise.all([getVisitorCountry(), hasChosenCountry()]);
  return (
    <>
      <Navbar />
      <CategoryBar />
      <CountryPicker current={current} chosen={chosen} />
      <div className="flex-1 w-full">{children}</div>
      <Footer />
    </>
  );
}
