import { useState } from "react";
import { useRouter } from "next/router";
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
  { key: "climate", label: "Climate & Environment", icon: "🌍" },
  { key: "agriculture", label: "Agriculture & Food", icon: "🌾" },
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
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "Nasdaq 100" },
  { symbol: "GLD", name: "Gold" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "XLE", name: "Energy Sector" },
  { symbol: "TLT", name: "Treasury Bonds" },
  { symbol: "USO", name: "Oil Fund" },
  { symbol: "ITA", name: "Defense & Aerospace" },
  { symbol: "SMH", name: "Semiconductors" },
  { symbol: "FXI", name: "China Large-Cap" },
  { symbol: "BABA", name: "Alibaba" },
  { symbol: "TSM", name: "Taiwan Semi" },
  { symbol: "VXX", name: "Volatility" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "EEM", name: "Emerging Markets" },
  { symbol: "WEAT", name: "Wheat" },
  { symbol: "ICLN", name: "Clean Energy" },
  { symbol: "URA", name: "Uranium" },
  { symbol: "BDRY", name: "Shipping" },
  { symbol: "BITO", name: "Bitcoin ETF" },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [symbols, setSymbols] = useState<string[]>(["SPY", "QQQ", "GLD"]);
  const [saving, setSaving] = useState(false);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, regions, symbols }),
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to save preferences:", err);
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10 text-lg font-bold text-emerald">
            G
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Welcome to <span className="text-emerald">GeoPulse</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Customize your intelligence feed. You can change this anytime in Settings.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  step === s
                    ? "bg-emerald text-black"
                    : step > s
                    ? "bg-emerald/20 text-emerald"
                    : "bg-white/[0.06] text-zinc-600"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div className={`h-0.5 w-8 rounded ${step > s ? "bg-emerald/40" : "bg-white/[0.06]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="mb-6 flex justify-center gap-12 text-[10px] uppercase tracking-widest text-zinc-600">
          <span className={step === 1 ? "text-emerald" : ""}>Topics</span>
          <span className={step === 2 ? "text-emerald" : ""}>Regions</span>
          <span className={step === 3 ? "text-emerald" : ""}>Stocks</span>
        </div>

        {/* Step 1: Topics */}
        {step === 1 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold text-white">What topics interest you?</h2>
            <p className="mb-5 text-xs text-zinc-500">Select 3 or more to personalize your feed</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TOPIC_OPTIONS.map(({ key, label, icon }) => {
                const active = categories.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleItem(categories, setCategories, key)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-emerald/40 bg-emerald/10 text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                    {active && (
                      <span className="ml-auto text-emerald">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-zinc-600">{categories.length} selected</span>
              <button
                onClick={() => setStep(2)}
                disabled={categories.length < 3}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
                  categories.length >= 3
                    ? "bg-emerald text-black hover:bg-emerald/90"
                    : "bg-white/[0.06] text-zinc-600 cursor-not-allowed"
                }`}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Regions */}
        {step === 2 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold text-white">Which regions matter to you?</h2>
            <p className="mb-5 text-xs text-zinc-500">Select the regions you want to monitor</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REGION_OPTIONS.map(({ key, label, icon }) => {
                const active = regions.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleItem(regions, setRegions, key)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-emerald/40 bg-emerald/10 text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                    {active && <span className="ml-auto text-emerald">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-white/[0.06] px-4 py-2 text-sm text-zinc-400 hover:bg-white/[0.04] transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={regions.length === 0}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
                  regions.length > 0
                    ? "bg-emerald text-black hover:bg-emerald/90"
                    : "bg-white/[0.06] text-zinc-600 cursor-not-allowed"
                }`}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Stocks */}
        {step === 3 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold text-white">What stocks do you follow?</h2>
            <p className="mb-5 text-xs text-zinc-500">Select the ETFs and stocks you want to track</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POPULAR_SYMBOLS.map(({ symbol, name }) => {
                const active = symbols.includes(symbol);
                return (
                  <button
                    key={symbol}
                    onClick={() => toggleItem(symbols, setSymbols, symbol)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-emerald/40 bg-emerald/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className={`text-sm font-bold ${active ? "text-white" : "text-zinc-400"}`}>
                      {symbol}
                    </span>
                    <p className={`text-[10px] mt-0.5 ${active ? "text-emerald/70" : "text-zinc-600"}`}>
                      {name}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg border border-white/[0.06] px-4 py-2 text-sm text-zinc-400 hover:bg-white/[0.04] transition"
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving || symbols.length === 0}
                className={`rounded-lg px-8 py-2.5 text-sm font-semibold transition ${
                  symbols.length > 0 && !saving
                    ? "bg-emerald text-black hover:bg-emerald/90"
                    : "bg-white/[0.06] text-zinc-600 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving..." : "Start Exploring →"}
              </button>
            </div>
          </div>
        )}

        {/* Skip link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition"
          >
            Skip for now — I'll customize later
          </button>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = requireAuth;
