import { useState } from "react";
import Layout from "../components/layout/Layout";
import SectionCard from "../components/ui/SectionCard";
import { useStatus } from "../lib/hooks/useStatus";
import { usePreferences } from "../lib/hooks/usePreferences";
import { relativeTime } from "../lib/format";
import { requireAuth } from "../lib/requireAuth";

const TOPIC_OPTIONS = [
  { key: "energy", label: "Energy & Oil", icon: "⛽" },
  { key: "conflict", label: "Conflicts & Wars", icon: "⚔️" },
  { key: "economic", label: "Economic Policy", icon: "💰" },
  { key: "defense", label: "Defense & Military", icon: "🛡️" },
  { key: "technology", label: "Technology", icon: "🔬" },
  { key: "cyber", label: "Cybersecurity", icon: "🔐" },
  { key: "sanctions", label: "Sanctions & Tariffs", icon: "📊" },
  { key: "political", label: "Elections & Politics", icon: "🗳️" },
  { key: "healthcare", label: "Healthcare", icon: "💊" },
  { key: "climate", label: "Climate", icon: "🌍" },
  { key: "agriculture", label: "Agriculture", icon: "🌾" },
  { key: "trade", label: "Trade & Shipping", icon: "🚢" },
  { key: "threat", label: "Nuclear & Threats", icon: "☢️" },
  { key: "science", label: "Science", icon: "🧪" },
];

const REGION_OPTIONS = [
  { key: "North America", label: "North America", icon: "🇺🇸" },
  { key: "Europe", label: "Europe", icon: "🇪🇺" },
  { key: "Middle East", label: "Middle East", icon: "🌍" },
  { key: "Asia-Pacific", label: "Asia-Pacific", icon: "🌏" },
  { key: "Africa", label: "Africa", icon: "🌍" },
  { key: "South America", label: "South America", icon: "🌎" },
  { key: "Central Asia", label: "Central Asia", icon: "🏔️" },
];

const POPULAR_SYMBOLS = [
  "SPY", "QQQ", "GLD", "NVDA", "XLE", "TLT", "USO", "ITA",
  "SMH", "FXI", "BABA", "TSM", "VXX", "XLF", "EEM", "WEAT",
  "ICLN", "URA", "BDRY", "BITO",
];

export default function Settings() {
  const { status } = useStatus();
  const { preferences, savePreferences, isLoading: prefsLoading } = usePreferences();
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [saving, setSaving] = useState(false);

  // Local state for editing
  const [editCategories, setEditCategories] = useState<string[] | null>(null);
  const [editRegions, setEditRegions] = useState<string[] | null>(null);
  const [editSymbols, setEditSymbols] = useState<string[] | null>(null);

  const categories = editCategories ?? preferences.categories;
  const regions = editRegions ?? preferences.regions;
  const symbols = editSymbols ?? preferences.symbols;

  const hasChanges = editCategories !== null || editRegions !== null || editSymbols !== null;

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    await savePreferences({ categories, regions, symbols });
    setEditCategories(null);
    setEditRegions(null);
    setEditSymbols(null);
    setSaving(false);
  };

  const handleManualIngest = async () => {
    setTriggerStatus("running");
    try {
      const res = await fetch(`/api/cron/ingest?secret=${encodeURIComponent(process.env.NEXT_PUBLIC_CRON_SECRET || "")}`, {
        headers: { "x-cron-secret": process.env.NEXT_PUBLIC_CRON_SECRET || "" },
      });
      setTriggerStatus(res.ok ? "done" : "error");
    } catch {
      setTriggerStatus("error");
    }
    setTimeout(() => setTriggerStatus("idle"), 3000);
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Interest Preferences */}
        <SectionCard title="Your Interests" subtitle="Personalize your intelligence feed — events matching your interests appear first">
          {prefsLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/[0.03]" />
          ) : (
            <div className="space-y-5">
              {/* Topics */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-zinc-400">Topics</h3>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_OPTIONS.map(({ key, label, icon }) => {
                    const active = categories.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleItem(categories, (v) => setEditCategories(v), key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                          active
                            ? "border-emerald/30 bg-emerald/10 text-emerald"
                            : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span>{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regions */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-zinc-400">Regions</h3>
                <div className="flex flex-wrap gap-1.5">
                  {REGION_OPTIONS.map(({ key, label, icon }) => {
                    const active = regions.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleItem(regions, (v) => setEditRegions(v), key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                          active
                            ? "border-emerald/30 bg-emerald/10 text-emerald"
                            : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span>{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stocks */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-zinc-400">Stocks & ETFs</h3>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SYMBOLS.map((sym) => {
                    const active = symbols.includes(sym);
                    return (
                      <button
                        key={sym}
                        onClick={() => toggleItem(symbols, (v) => setEditSymbols(v), sym)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          active
                            ? "border-emerald/30 bg-emerald/10 text-emerald"
                            : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save button */}
              {hasChanges && (
                <button
                  onClick={handleSavePrefs}
                  disabled={saving}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
              )}
            </div>
          )}
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* System Status */}
          <SectionCard title="System Status" subtitle="Pipeline health">
            <div className="space-y-2">
              {[
                { label: "Last Ingestion", value: status?.lastIngestion?.completedAt ? relativeTime(status.lastIngestion.completedAt) : "Never" },
                {
                  label: "Status",
                  value: status?.lastIngestion?.status ?? "idle",
                  badge: true,
                  ok: status?.lastIngestion?.status === "success",
                },
                { label: "Total Events", value: (status?.stats?.totalEvents ?? 0).toString() },
                { label: "Correlations", value: (status?.stats?.totalCorrelations ?? 0).toString() },
                { label: "Patterns", value: (status?.stats?.totalPatterns ?? 0).toString() },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <span className="text-sm text-zinc-500">{item.label}</span>
                  {item.badge ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.ok ? "bg-emerald/10 text-emerald" : "bg-red-400/10 text-red-400"}`}>
                      {item.value}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-white">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Automation */}
          <SectionCard title="Automation" subtitle="Pipeline control">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="text-sm text-zinc-500">Auto-ingest cycle</span>
                <span className="text-sm font-semibold text-white">Every 2 hours</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="text-sm text-zinc-500">Data Sources</span>
                <span className="text-sm font-semibold text-white">27 RSS + GDELT</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="text-sm text-zinc-500">Correlation Engine</span>
                <span className="text-sm font-semibold text-white">174 keyword rules</span>
              </div>
              <button
                onClick={handleManualIngest}
                disabled={triggerStatus === "running"}
                className="btn-primary w-full disabled:opacity-50"
              >
                {triggerStatus === "running"
                  ? "Running ingestion..."
                  : triggerStatus === "done"
                  ? "✓ Ingestion complete!"
                  : triggerStatus === "error"
                  ? "Failed - try again"
                  : "Trigger Manual Ingestion"}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps = requireAuth;
