import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/layout/Layout";
import MetricCard from "../components/ui/MetricCard";
import SectionCard from "../components/ui/SectionCard";
import StockTicker from "../components/ui/StockTicker";
import EventMarketPanel from "../components/dashboard/EventMarketPanel";
import PatternInsightsCard from "../components/dashboard/PatternInsightsCard";
import TopMoversCard from "../components/dashboard/TopMoversCard";
import { useEvents } from "../lib/hooks/useEvents";
import { useWatchlists } from "../lib/hooks/useWatchlists";
import { useQuotes, type Quote } from "../lib/hooks/useQuotes";
import { useStatus } from "../lib/hooks/useStatus";
import { usePreferences } from "../lib/hooks/usePreferences";
import { requireAuth } from "../lib/requireAuth";

const DEFAULT_WATCHLIST_SYMBOLS = ["SPY", "QQQ", "GLD", "XLE", "TLT", "ITA", "USO", "NVDA"];

const CATEGORIES = [
  { key: "all", label: "All Events" },
  { key: "conflict", label: "Conflict & War" },
  { key: "energy", label: "Energy & Oil" },
  { key: "economic", label: "Economy" },
  { key: "sanctions", label: "Sanctions & Tariffs" },
  { key: "political", label: "Politics" },
  { key: "technology", label: "Technology" },
  { key: "defense", label: "Defense" },
  { key: "cyber", label: "Cybersecurity" },
  { key: "healthcare", label: "Healthcare" },
  { key: "climate", label: "Climate" },
  { key: "agriculture", label: "Agriculture" },
  { key: "trade", label: "Trade & Shipping" },
  { key: "threat", label: "Nuclear & Threats" },
  { key: "science", label: "Science" },
  { key: "general", label: "General" },
];

// Client-side event categorization based on keywords
function categorizeEvent(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  const rules: Array<{ cat: string; words: string[] }> = [
    { cat: "conflict", words: ["attack", "missile", "strike", "war", "invasion", "bombing", "airstrike", "troops", "combat", "casualties", "killed", "shelling", "offensive", "ceasefire", "hostilities", "clashes", "battlefield"] },
    { cat: "defense", words: ["defense", "military", "army", "navy", "warship", "fighter jet", "arms deal", "weapon", "pentagon", "nato", "drone strike", "air force", "marines", "special forces"] },
    { cat: "energy", words: ["oil", "opec", "pipeline", "natural gas", "energy", "crude", "refinery", "lng", "petroleum", "fuel", "barrel", "drilling", "offshore"] },
    { cat: "economic", words: ["recession", "inflation", "default", "debt", "bailout", "collapse", "bankruptcy", "crash", "downturn", "unemployment", "interest rate", "central bank", "gdp", "stimulus", "quantitative", "federal reserve", "monetary policy", "bond", "treasury", "stock market"] },
    { cat: "sanctions", words: ["sanction", "embargo", "tariff", "blacklist", "trade war", "export control", "import duty", "trade ban", "asset freeze", "economic penalty"] },
    { cat: "political", words: ["election", "protest", "revolution", "unrest", "overthrow", "impeach", "resign", "riot", "vote", "parliament", "congress", "president", "prime minister", "democracy", "authoritarian", "coup", "referendum"] },
    { cat: "technology", words: ["semiconductor", "chip", "artificial intelligence", "tech", "5g", "quantum", "software", "satellite", "space", "robot", "blockchain", "crypto", "machine learning", "startup", "silicon valley", "data center"] },
    { cat: "cyber", words: ["cybersecurity", "cyber attack", "hack", "ransomware", "data breach", "malware", "phishing", "encryption", "zero-day", "cyber warfare"] },
    { cat: "healthcare", words: ["pandemic", "virus", "vaccine", "outbreak", "epidemic", "disease", "drug", "pharmaceutical", "hospital", "health", "fda", "medical", "who", "public health", "clinical trial"] },
    { cat: "climate", words: ["climate", "carbon", "emissions", "earthquake", "tsunami", "hurricane", "flood", "wildfire", "drought", "renewable", "solar", "environmental", "global warming", "sea level", "deforestation"] },
    { cat: "agriculture", words: ["wheat", "grain", "crop", "famine", "food crisis", "agriculture", "corn", "soybean", "fertilizer", "harvest", "livestock", "farming"] },
    { cat: "trade", words: ["shipping", "freight", "maritime", "supply chain", "logistics", "port", "trade deal", "import", "export", "wto", "container", "cargo", "customs"] },
    { cat: "threat", words: ["nuclear", "atomic", "warhead", "escalation", "terror", "hostage", "assassination", "bioweapon", "chemical weapon", "missile test", "threat level"] },
    { cat: "science", words: ["research", "discovery", "scientific", "physics", "biology", "astronomy", "genome", "crispr", "nasa", "experiment", "breakthrough", "university study", "laboratory"] },
  ];

  let bestCat = "general";
  let bestScore = 0;
  for (const { cat, words } of rules) {
    const score = words.filter((w) => text.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }
  return bestCat;
}

export default function Dashboard() {
  const router = useRouter();
  const { events, isLoading } = useEvents();
  const { watchlists } = useWatchlists();
  const { status } = useStatus();
  const { preferences, isLoading: prefsLoading } = usePreferences();
  const [activeCategory, setActiveCategory] = useState("for-you");

  // Redirect to onboarding if user hasn't set preferences yet
  useEffect(() => {
    if (!prefsLoading && !preferences.onboarded && preferences.categories.length === 0) {
      // Don't redirect if they've been on the dashboard before — just default to "all"
      setActiveCategory("all");
    }
  }, [prefsLoading, preferences]);

  const hasPreferences = preferences.categories.length > 0;

  // Get symbols from watchlist + correlated events
  const allSymbols = useMemo(() => {
    const symbols = new Set<string>(DEFAULT_WATCHLIST_SYMBOLS);
    if (watchlists[0]?.items) {
      watchlists[0].items.forEach((item) => symbols.add(item.symbol));
    }
    events.forEach((e) =>
      e.correlations?.forEach((c) => symbols.add(c.symbol))
    );
    return Array.from(symbols);
  }, [events, watchlists]);

  const { quotes } = useQuotes(allSymbols);

  const quoteMap = useMemo(() => {
    const map = new Map<string, Quote>();
    quotes.forEach((q) => map.set(q.symbol, q));
    return map;
  }, [quotes]);

  // Categorize events and compute summary
  const { categorized, summary } = useMemo(() => {
    const catMap = new Map<string, typeof events>();
    const now = Date.now();

    for (const e of events) {
      const cat = categorizeEvent(e.title, e.summary);
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(e);
    }

    const last24h = events.filter(
      (e) => now - new Date(e.publishedAt).getTime() < 24 * 60 * 60 * 1000
    );
    const highSeverity = events.filter((e) => (e.severity ?? 0) >= 7);
    const correlationCount = events.reduce(
      (total, e) => total + (e.correlations?.length ?? 0),
      0
    );

    // Category counts for badges
    const categoryCounts: Record<string, number> = {};
    for (const [cat, evts] of catMap) {
      categoryCounts[cat] = evts.length;
    }

    // Region counts
    const regionCounts = events.reduce<Record<string, number>>((acc, e) => {
      const key = e.region || "Global";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topRegions = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      categorized: catMap,
      summary: { last24h, highSeverity, correlationCount, categoryCounts, topRegions },
    };
  }, [events]);

  // Filter events by category (including "for-you" personalized feed)
  const filteredEvents = useMemo(() => {
    let evts: typeof events;

    if (activeCategory === "for-you" && hasPreferences) {
      // "For You" feed: show events matching user's preferred categories or regions
      const prefCats = new Set(preferences.categories);
      const prefRegions = new Set(preferences.regions);

      evts = events.filter((e) => {
        const cat = categorizeEvent(e.title, e.summary);
        if (prefCats.has(cat)) return true;
        if (prefRegions.has(e.region)) return true;
        // Also check if any correlated symbol matches user's preferred symbols
        if (preferences.symbols.length > 0 && e.correlations?.some((c) => preferences.symbols.includes(c.symbol))) return true;
        return false;
      });
    } else if (activeCategory === "all" || activeCategory === "for-you") {
      evts = events;
    } else {
      evts = categorized.get(activeCategory) ?? [];
    }

    // Prioritize events with correlations, then by severity
    return [...evts]
      .sort((a, b) => {
        const aCorr = a.correlations?.length ?? 0;
        const bCorr = b.correlations?.length ?? 0;
        if (bCorr !== aCorr) return bCorr - aCorr;
        return (b.severity ?? 0) - (a.severity ?? 0);
      })
      .slice(0, 20);
  }, [events, categorized, activeCategory, preferences, hasPreferences]);

  // Ticker items from quotes
  const tickerItems = quotes.filter((q) => q.price > 0);

  return (
    <Layout>
      {/* Stock Ticker */}
      <StockTicker items={tickerItems} />

      {/* Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Events (24h)"
          value={(status?.stats?.recentEvents24h ?? summary.last24h.length).toString()}
          trend={`${events.length} total monitored`}
          sparkline={[18, 22, 20, 26, 28, 31, 29]}
        />
        <MetricCard
          label="High Severity"
          value={summary.highSeverity.length.toString()}
          trend="Severity 7+ signals"
          tone="coral"
          sparkline={[3, 4, 6, 5, 7, 8, 7]}
        />
        <MetricCard
          label="Market Links"
          value={summary.correlationCount.toString()}
          trend="Event-asset correlations"
          tone="amber"
          sparkline={[12, 15, 18, 16, 22, 25, 24]}
        />
        <MetricCard
          label="Patterns"
          value={(status?.stats?.totalPatterns ?? 0).toString()}
          trend="Learned from history"
          tone="ocean"
          sparkline={[2, 4, 5, 8, 10, 12, 15]}
        />
      </div>

      {/* Main Content: 2 columns */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left: Event Market Panel */}
        <SectionCard
          title="Events & Market Impact"
          subtitle="News events with correlated stock movements"
          action={
            <Link href="/timeline" className="ghost-chip hover:bg-white/[0.06]">
              View all
            </Link>
          }
        >
          {/* Category tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-white/[0.06] pb-3">
            {/* "For You" tab (only if user has preferences) */}
            {hasPreferences && (
              <button
                onClick={() => setActiveCategory("for-you")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                  activeCategory === "for-you"
                    ? "bg-emerald/15 text-emerald border border-emerald/30"
                    : "border border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                }`}
              >
                ✦ For You
              </button>
            )}
            {CATEGORIES.map(({ key, label }) => {
              const count = key === "all" ? events.length : (summary.categoryCounts[key] ?? 0);
              if (key !== "all" && count === 0) return null;
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                    isActive
                      ? "bg-emerald/15 text-emerald border border-emerald/30"
                      : "border border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                >
                  {label}
                  <span className={`text-[10px] ${isActive ? "text-emerald/70" : "text-zinc-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <EventMarketPanel
            events={filteredEvents}
            quoteMap={quoteMap}
          />
        </SectionCard>

        {/* Right column */}
        <div className="space-y-4">
          <SectionCard title="Top Movers" subtitle="Highest absolute % change">
            <TopMoversCard quotes={quotes} />
          </SectionCard>

          <SectionCard
            title="Pattern Insights"
            subtitle="Predictions from historical correlations"
          >
            <PatternInsightsCard />
          </SectionCard>

          <SectionCard title="Regional Hotspots" subtitle="Event density by region">
            <div className="space-y-1.5">
              {summary.topRegions.map((r) => (
                <div
                  key={r.region}
                  className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{r.region}</span>
                    <span className="text-xs font-bold text-amber-400">{r.count}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.05]">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-emerald to-cyan"
                      style={{
                        width: `${Math.min(
                          100,
                          (r.count / Math.max(...summary.topRegions.map((x) => x.count), 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {isLoading && (
        <p className="text-center text-xs text-zinc-500 animate-pulse">Loading intelligence data...</p>
      )}
    </Layout>
  );
}

export const getServerSideProps = requireAuth;
