import type { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black text-zinc-300">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-3 px-3 py-3 lg:flex-row lg:gap-4 lg:px-4">
        <aside className="lg:w-56 xl:w-60 shrink-0">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          <Header />
          <main className="flex-1 space-y-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
