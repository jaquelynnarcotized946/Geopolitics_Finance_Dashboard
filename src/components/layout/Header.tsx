import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useStatus } from "../../lib/hooks/useStatus";
import { relativeTime } from "../../lib/format";

export default function Header() {
  const { data: session } = useSession();
  const { status, mutate } = useStatus();
  const [syncing, setSyncing] = useState(false);

  const lastSync = status?.lastIngestion?.completedAt
    ? relativeTime(status.lastIngestion.completedAt)
    : "never";

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        // Refresh status after sync
        mutate();
      }
    } catch {
      // silently fail
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-5 py-3">
      <div>
        <h1 className="text-base font-bold text-white">
          GeoPulse <span className="text-gradient">Intelligence</span>
        </h1>
        <p className="text-[11px] text-zinc-500">
          Geopolitical signals linked to market movements
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="chip">
          <span className={`h-1.5 w-1.5 rounded-full ${
            status?.lastIngestion?.status === "success" ? "bg-emerald" : "bg-zinc-500"
          }`} />
          Synced {lastSync}
        </span>
        <button
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-400 transition hover:text-zinc-200 hover:bg-white/[0.06] disabled:opacity-40"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
        {session?.user && (
          <button
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-500 transition hover:text-zinc-300"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
