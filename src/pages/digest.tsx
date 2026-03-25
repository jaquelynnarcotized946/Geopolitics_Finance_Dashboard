import Link from "next/link";
import { useMemo } from "react";
import Layout from "../components/layout/Layout";
import SectionCard from "../components/ui/SectionCard";
import SeverityBadge from "../components/ui/SeverityBadge";
import { useEvents, type EventItem } from "../lib/hooks/useEvents";
import { useQuotes, type Quote } from "../lib/hooks/useQuotes";
import { usePatterns } from "../lib/hooks/usePatterns";
import { relativeTime, formatPct, formatCurrency } from "../lib/format";
import { requireAuth } from "../lib/requireAuth";

function categorizeEvent(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  const rules: Array<{ cat: string; words: string[] }> = [
    { cat: "Conflict", words: ["attack", "missile", "strike", "war", "invasion", "troops", "combat", "killed"] },
    { cat: "Energy", words: ["oil", "opec", "pipeline", "natural gas", "energy", "crude", "petroleum"] },
    { cat: "Economic", words: ["recession", "inflation", "debt", "interest rate", "central bank", "gdp", "stimulus"] },
    { cat: "Technology", words: ["semiconductor", "chip", "artificial intelligence", "tech", "cyber", "quantum"] },
    { cat: "Political", words: ["election", "protest", "parliament", "president", "vote", "democracy"] },
    { cat: "Trade", words: ["tariff", "sanction", "trade war", "shipping", "supply chain", "export"] },
    { cat: "Healthcare", words: ["pandemic", "virus", "vaccine", "outbreak", "health", "fda"] },
    { cat: "Climate", words: ["climate", "carbon", "emissions", "hurricane", "flood", "renewable"] },
  ];
  let best = "General";
  let bestScore = 0;
  for (const { cat, words } of rules) {
    const score = words.filter((w) => text.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

export default function Digest() {
  const { events } = useEvents();
  const { patterns } = usePatterns();

  // Get all unique correlated symbols
  const allSymbols = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => e.correlations?.forEach((c) => s.add(c.symbol)));
    return Array.from(s);
  }, [events]);

  const { quotes } = useQuotes(allSymbols);
  const quoteMap = useMemo(() => {
    const m = new Map<string, Quote>();
    quotes.forEach((q) => m.set(q.symbol, q));
    return m;
  }, [quotes]);

  // Compute digest data
  const digest = useMemo(() => {
    const now = Date.now();
    const last24h = events.filter((e) => now - new Date(e.publishedAt).getTime() < 24 * 60 * 60 * 1000);
    const last48h = events.filter((e) => now - new Date(e.publishedAt).getTime() < 48 * 60 * 60 * 1000);

    // Top 5 highest severity events
    const topEvents = [...last24h].sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0)).slice(0, 5);

    // Top movers (from quotes)
    const movers = [...quotes]
      .filter((q) => q.price > 0)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 8);

    // Category breakdown
    const catCounts: Record<string, number> = {};
    for (const e of last24h) {
      const cat = categorizeEvent(e.title, e.summary);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(catCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Region breakdown
    const regionCounts: Record<string, number> = {};
    for (const e of last24h) {
      const r = e.region || "Global";
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    }
    const regionBreakdown = Object.entries(regionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Sentiment summary
    const sentiments = last24h.filter((e) => e.sentimentLabel);
    const posCount = sentiments.filter((e) => e.sentimentLabel === "positive").length;
    const negCount = sentiments.filter((e) => e.sentimentLabel === "negative").length;
    const neuCount = sentiments.filter((e) => e.sentimentLabel === "neutral").length;

    // Most affected stocks (by correlation count)
    const symbolCorrelations: Record<string, number> = {};
    for (const e of last24h) {
      for (const c of e.correlations ?? []) {
        symbolCorrelations[c.symbol] = (symbolCorrelations[c.symbol] || 0) + 1;
      }
    }
    const mostAffected = Object.entries(symbolCorrelations)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents24h: last24h.length,
      totalEvents48h: last48h.length,
      topEvents,
      movers,
      categoryBreakdown,
      regionBreakdown,
      sentiment: { positive: posCount, negative: negCount, neutral: neuCount },
      mostAffected,
    };
  }, [events, quotes]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5">
          <h1 className="text-xl font-bold text-white">Daily Intelligence Digest</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{today}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
            <span className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-zinc-300">
              <span className="font-bold text-white">{digest.totalEvents24h}</span> events today
            </span>
            <span className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-zinc-300">
              <span className="font-bold text-emerald">{digest.sentiment.positive}</span> positive
            </span>
            <span className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-zinc-300">
              <span className="font-bold text-red-400">{digest.sentiment.negative}</span> negative
            </span>
            <span className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-zinc-300">
              <span className="font-bold text-zinc-400">{digest.sentiment.neutral}</span> neutral
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Top Events */}
            <SectionCard title="Top Stories" subtitle="Highest severity events today">
              <div className="space-y-2">
                {digest.topEvents.map((event, idx) => (
                  <div key={event.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold text-zinc-500">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                          <span>{event.source}</span>
                          <span>·</span>
                          <span>{event.region}</span>
                          <span>·</span>
                          <span>{relativeTime(event.publishedAt)}</span>
                          {event.sentimentLabel && (
                            <>
                              <span>·</span>
                              <span className={
                                event.sentimentLabel === "positive" ? "text-emerald font-semibold" :
                                event.sentimentLabel === "negative" ? "text-red-400 font-semibold" :
                                "text-zinc-500"
                              }>
                                {event.sentimentLabel}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="mt-0.5 text-sm font-semibold text-white leading-snug">
                          <Link href={`/event/${event.id}`} className="!text-white hover:!text-emerald transition">
                            {event.title}
                          </Link>
                        </h3>
                        <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2">{event.summary}</p>
                        {/* Correlated stocks */}
                        {(event.correlations?.length ?? 0) > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {event.correlations!.slice(0, 5).map((corr) => {
                              const q = quoteMap.get(corr.symbol);
                              const isUp = corr.impactDirection === "up";
                              return (
                                <Link href={`/stock/${corr.symbol}`} key={corr.id}
                                  className="inline-flex items-center gap-1 rounded border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[10px] hover:bg-white/[0.05] transition">
                                  <span className={`h-1 w-1 rounded-full ${isUp ? "bg-emerald" : "bg-red-400"}`} />
                                  <span className="font-bold text-zinc-300">{corr.symbol}</span>
                                  {q && q.price > 0 && (
                                    <span className={isUp ? "text-emerald" : "text-red-400"}>
                                      {formatPct(q.changePct)}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <SeverityBadge severity={event.severity ?? 1} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Most Affected Stocks */}
            <SectionCard title="Most Mentioned Stocks" subtitle="Stocks appearing in the most events today">
              <div className="grid gap-2 sm:grid-cols-2">
                {digest.mostAffected.map(({ symbol, count }) => {
                  const q = quoteMap.get(symbol);
                  return (
                    <Link href={`/stock/${symbol}`} key={symbol}
                      className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] transition">
                      <div>
                        <span className="text-sm font-bold text-white">{symbol}</span>
                        <span className="ml-2 text-[10px] text-zinc-600">{count} mentions</span>
                      </div>
                      {q && q.price > 0 && (
                        <div className="text-right">
                          <span className="text-xs text-zinc-400">{formatCurrency(q.price, q.currency || "USD")}</span>
                          <span className={`ml-1.5 text-xs font-bold ${q.changePct >= 0 ? "text-emerald" : "text-red-400"}`}>
                            {formatPct(q.changePct)}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Market Movers */}
            <SectionCard title="Market Movers" subtitle="Biggest % changes today">
              <div className="space-y-1.5">
                {digest.movers.map((q) => (
                  <Link href={`/stock/${q.symbol}`} key={q.symbol}
                    className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04] transition">
                    <span className="text-sm font-bold text-zinc-300">{q.symbol}</span>
                    <div className="text-right">
                      <span className="text-xs text-zinc-500">{formatCurrency(q.price, q.currency || "USD")}</span>
                      <span className={`ml-2 text-xs font-bold ${q.changePct >= 0 ? "text-emerald" : "text-red-400"}`}>
                        {q.changePct >= 0 ? "▲" : "▼"} {formatPct(q.changePct)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>

            {/* Category Breakdown */}
            <SectionCard title="By Category" subtitle="Event distribution today">
              <div className="space-y-1.5">
                {digest.categoryBreakdown.map(({ name, count }) => (
                  <div key={name} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">{name}</span>
                      <span className="text-xs font-bold text-amber-400">{count}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-white/[0.05]">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-emerald to-cyan-400"
                        style={{ width: `${Math.min(100, (count / Math.max(...digest.categoryBreakdown.map(x => x.count), 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Regional Breakdown */}
            <SectionCard title="By Region" subtitle="Where events are happening">
              <div className="space-y-1.5">
                {digest.regionBreakdown.map(({ name, count }) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-xs font-semibold text-zinc-300">{name}</span>
                    <span className="text-xs font-bold text-zinc-400">{count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Top Patterns */}
            {patterns.length > 0 && (
              <SectionCard title="Active Patterns" subtitle="Learned from historical events">
                <div className="space-y-1.5">
                  {patterns.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">{p.symbol}</span>
                        <span className={`text-xs font-bold ${p.direction === "up" ? "text-emerald" : "text-red-400"}`}>
                          {p.direction === "up" ? "↑" : "↓"} {formatPct(p.avgImpactPct)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[9px] text-zinc-600">
                        {p.eventCategory} · {p.occurrences} events · {Math.round(p.confidence * 100)}% confidence
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps = requireAuth;
