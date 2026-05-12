import { Navbar } from "@/components/layout/navbar";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
