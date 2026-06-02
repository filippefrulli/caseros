import { Navbar } from "@/components/layout/navbar";
import { ConversationSidebar } from "@/components/messages/conversation-sidebar";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <Navbar />
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-8 sm:py-8">
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Left sidebar — hidden on mobile */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-gray-100 md:flex">
          <div className="shrink-0 border-b border-gray-100 px-5 py-4">
            <h1 className="text-base font-semibold text-gray-900">Messages</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationSidebar />
          </div>
        </aside>

        {/* Right panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
    </>
  );
}
