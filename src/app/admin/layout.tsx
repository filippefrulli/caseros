import { notFound } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  const pendingSellers = await prisma.sellerProfile.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-bg-card px-3 py-6">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 px-3 text-sm font-bold text-text-primary hover:opacity-75 transition-opacity"
        >
          <Home size={16} />
          Caseros
        </Link>

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Admin
        </p>

        <AdminNav pendingSellers={pendingSellers} />
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
