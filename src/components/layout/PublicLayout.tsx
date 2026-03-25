import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black text-zinc-300">
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        {children}
      </div>
    </div>
  );
}
