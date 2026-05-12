import { Navbar } from "@/components/layout/navbar";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
