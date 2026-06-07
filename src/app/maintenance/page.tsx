import { Home } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-text-primary">
            <Home size={18} />
            Caseros
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-5">
          <div className="text-7xl">🔧</div>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            We&apos;ll be back shortly.
          </h1>

          <p className="text-text-secondary">
            Looks like something behind the scenes is throwing a tantrum.
          </p>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} Caseros. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
