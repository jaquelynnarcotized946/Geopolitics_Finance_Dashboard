import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import EventMarketPanel from "../components/dashboard/EventMarketPanel";
import Layout from "../components/layout/Layout";
import TopMoversCard from "../components/dashboard/TopMoversCard";
import HeatBadge from "../components/ui/HeatBadge";
import SectionCard from "../components/ui/SectionCard";
import SignalOverview from "../components/ui/SignalOverview";
import StockTicker from "../components/ui/StockTicker";
import SymbolHoverCard from "../components/ui/SymbolHoverCard";
import TrustSummary from "../components/ui/TrustSummary";
import { getAssetMeta } from "../lib/assets";
import { formatCurrency, formatPct, relativeTime } from "../lib/format";
import { useEvents } from "../lib/hooks/useEvents";
import { useQuotes } from "../lib/hooks/useQuotes";
import { useRiskOverview } from "../lib/hooks/useRiskOverview";
import { useWatchlists } from "../lib/hooks/useWatchlists";
import { useWorkspace } from "../lib/hooks/useWorkspace";
import { requireAuth } from "../lib/serverAuth";

const TradingViewChart = dynamic(
  () => import("../components/ui/TradingViewChart").then((module) => module.TradingViewChart),
  { ssr: false, loading: () => <div className="h-[360px] animate-pulse rounded-[24px] bg-white/[0.03]" /> }
);

const fetcher = (url: string) => fetch(url).then((response) => response.json());
const TIME_WINDOWS = ["6h", "24h", "72h", "7d"] as const;
const SORT_OPTIONS = ["relevance", "newest", "severity", "support"] as const;

type StockLensResponse = {
  summary: {
    totalEvents: number;
    dominantDirection: string;
    patternConfidence: number;
  };
  correlations: Array<{
    id: string;
    symbol: string;
    impactDirection: string;
    event: {
      id: string;
      title: string;
      summary: string;
      source: string;
      region: string;
      publishedAt: string;
      url: string | null;
      whyThisMatters?: string | null;
    };
  }>;
  patterns: Array<{
    id: string;
    eventCategory: string;
    direction: string;
    avgImpactPct: number;
    confidence: number;
    occurrences: number;
  }>;
};

export default function Dashboard() {
  const router = useRouter();
  const { watchlists } = useWatchlists();
  const { workspace, saveWorkspace } = useWorkspace();

  const queryText = typeof router.query.q === "string" ? router.query.q : "";
  const selectedRegion = typeof router.query.region === "string" ? router.query.region : workspace.pinnedRegions[0] || "";
  const timeWindow = typeof router.query.window === "string" ? router.query.window : workspace.defaultTimeWindow;
  const sort = typeof router.query.sort === "string" ? router.query.sort : workspace.defaultSort;
  const marketLensSymbol = typeof router.query.symbol === "string" ? router.query.symbol.toUpperCase() : "";

  const [searchInput, setSearchInput] = useState(queryText);
  const deferredSearchInput = useDeferredValue(searchInput);

  useEffect(() => {
    setSearchInput(queryText);
  }, [queryText]);

  const updateRoute = (patch: Record<string, string | undefined>) => {
    const nextQuery = { ...router.query, ...patch };
    Object.keys(nextQuery).forEach((key) => {
      if (!nextQuery[key]) delete nextQuery[key];
    });
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  };

  useEffect(() => {
    const normalized = deferredSearchInput.trim();
    if (normalized === queryText.trim()) return undefined;
    const timeoutId = window.setTimeout(() => updateRoute({ q: normalized || undefined }), 250);
    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchInput, queryText]);

  const { riskOverview } = useRiskOverview(timeWindow);
  const { events, isLoading } = useEvents({
    q: queryText || undefined,
    regions: selectedRegion ? [selectedRegion] : undefined,
    timeWindow,
    sort: SORT_OPTIONS.includes(sort as (typeof SORT_OPTIONS)[number]) ? (sort as (typeof SORT_OPTIONS)[number]) : "relevance",
    limit: 18,
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId((current) => (current && events.some((event) => event.id === current) ? current : events[0].id));
  }, [events]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || events[0] || null,
    [events, selectedEventId]
  );

  const watchSymbols = useMemo(() => {
    const collected = new Set<string>();
    watchlists.forEach((watchlist) => watchlist.items.forEach((item) => collected.add(item.symbol.toUpperCase())));
    workspace.pinnedSymbols.forEach((symbol) => collected.add(symbol.toUpperCase()));
    riskOverview?.radar.topSymbols.slice(0, 4).forEach((symbol) => collected.add(symbol.toUpperCase()));
    return Array.from(collected);
  }, [riskOverview?.radar.topSymbols, watchlists, workspace.pinnedSymbols]);

  const activeSymbol = useMemo(() => {
    if (marketLensSymbol) return marketLensSymbol;
    if (selectedEvent?.correlations?.[0]?.symbol) return selectedEvent.correlations[0].symbol;
    return watchSymbols[0] || "";
  }, [marketLensSymbol, selectedEvent, watchSymbols]);

  const quoteSymbols = useMemo(() => {
    const symbols = new Set<string>();
    if (activeSymbol) symbols.add(activeSymbol);
    watchSymbols.slice(0, 6).forEach((symbol) => symbols.add(symbol));
    events.forEach((event) => event.correlations?.slice(0, 3).forEach((correlation) => symbols.add(correlation.symbol)));
    return Array.from(symbols).slice(0, 16);
  }, [activeSymbol, events, watchSymbols]);

  const { quotes } = useQuotes(quoteSymbols);
  const quoteMap = useMemo(() => new Map(quotes.map((quote) => [quote.symbol, quote])), [quotes]);
  const { data: stockLens } = useSWR<StockLensResponse>(activeSymbol ? `/api/stocks/${activeSymbol}` : null, fetcher, {
    refreshInterval: 300000,
  });

  const topRegions = riskOverview?.regions.slice(0, 4) ?? [];
  const tickerItems = (riskOverview?.radar.topMovers?.length ? riskOverview.radar.topMovers : quotes).slice(0, 8).map((item: any) => ({
    symbol: item.symbol,
    price: item.price,
    changePct: item.changePct,
    currency: item.currency || "USD",
  }));
  const lensMeta = getAssetMeta(activeSymbol || "SPY");
  const lensQuote = activeSymbol ? quoteMap.get(activeSymbol) : undefined;
  const lensNews = stockLens?.correlations.slice(0, 6) ?? [];
  const topPattern = stockLens?.patterns[0];

  const togglePinnedSymbol = async (symbol: string) => {
    const normalized = symbol.toUpperCase();
    const nextSymbols = workspace.pinnedSymbols.includes(normalized)
      ? workspace.pinnedSymbols.filter((item) => item !== normalized)
      : [...workspace.pinnedSymbols, normalized];
    await saveWorkspace({ pinnedSymbols: nextSymbols });
  };

  return (
    <Layout>
      <div className="space-y-4">
        <SectionCard title="Live Market Desk" subtitle="Keep the story stream stable, then inspect affected assets beside it.">
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_140px_150px]">
              <label className="rounded-[24px] border border-white/[0.06] bg-black/45 px-4 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Search</span>
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search news, countries, sectors, or symbols" className="mt-2 w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-600" />
              </label>
              <label className="rounded-[24px] border border-white/[0.06] bg-black/45 px-4 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Region</span>
                <select value={selectedRegion} onChange={(event) => updateRoute({ region: event.target.value || undefined })} className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/60 px-3 py-2 text-sm">
                  <option value="">All regions</option>
                  {topRegions.map((region) => <option key={region.scopeKey} value={region.scopeLabel}>{region.scopeLabel}</option>)}
                </select>
              </label>
              <label className="rounded-[24px] border border-white/[0.06] bg-black/45 px-4 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Window</span>
                <select value={timeWindow} onChange={async (event) => { updateRoute({ window: event.target.value }); await saveWorkspace({ defaultTimeWindow: event.target.value }); }} className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/60 px-3 py-2 text-sm">
                  {TIME_WINDOWS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="rounded-[24px] border border-white/[0.06] bg-black/45 px-4 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Sort</span>
                <select value={sort} onChange={async (event) => { updateRoute({ sort: event.target.value }); await saveWorkspace({ defaultSort: event.target.value as "relevance" | "newest" | "severity" | "support" }); }} className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/60 px-3 py-2 text-sm">
                  {SORT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>

            {tickerItems.length ? <StockTicker items={tickerItems} /> : null}
          </div>
        </SectionCard>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
          <div className="space-y-4">
            <SectionCard title="Live Story Stream" subtitle="Select a story once, then inspect the linked assets without losing your place.">
              <EventMarketPanel events={events} quoteMap={quoteMap} selectedEventId={selectedEvent?.id ?? null} activeSymbol={activeSymbol} onSelectEvent={setSelectedEventId} emptyState={{ title: isLoading ? "Loading live stories..." : "No stories match the current filters.", hint: isLoading ? "Pulling the latest linked events." : "Broaden the filters or wait for the next sync." }} />
            </SectionCard>

            <SectionCard title="Selected Story" subtitle="Open the event file, source coverage, or affected assets directly from here.">
              {selectedEvent ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/[0.06] bg-black/50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                          {selectedEvent.source} / {selectedEvent.region} / {relativeTime(selectedEvent.publishedAt)}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                          {selectedEvent.title}
                        </h2>
                      </div>
                      {selectedEvent.cluster ? (
                        <HeatBadge heatLevel={selectedEvent.cluster.heatLevel} trend={selectedEvent.cluster.trend} />
                      ) : null}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-zinc-400">
                      {selectedEvent.whyThisMatters || selectedEvent.summary}
                    </p>

                    {selectedEvent.reliability ? (
                      <SignalOverview className="mt-4" reliability={selectedEvent.reliability} />
                    ) : (
                      <TrustSummary
                        className="mt-4"
                        supportingSourcesCount={selectedEvent.supportingSourcesCount}
                        sourceReliability={selectedEvent.sourceReliability}
                        intelligenceQuality={selectedEvent.intelligenceQuality}
                        publishedAt={selectedEvent.publishedAt}
                      />
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/event/${selectedEvent.id}`} className="btn-primary">
                        Open event file
                      </Link>
                      {selectedEvent.url ? (
                        <a href={selectedEvent.url} target="_blank" rel="noreferrer" className="btn-secondary">
                          Open source article
                        </a>
                      ) : null}
                      {selectedEvent.cluster ? (
                        <span className="chip">{selectedEvent.cluster.storyCount} stories in cluster</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.06] bg-black/45 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Affected Assets</p>
                        <p className="mt-2 text-sm text-zinc-400">
                          Click a symbol to keep this story in place and move the market lens to that asset.
                        </p>
                      </div>
                      <span className="chip">{selectedEvent.correlations?.length ?? 0} linked symbols</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {(selectedEvent.correlations ?? []).map((correlation) => {
                        const quote = quoteMap.get(correlation.symbol);
                        const symbolIsActive = activeSymbol === correlation.symbol;
                        return (
                          <div key={correlation.id} className={`rounded-[22px] border p-4 ${symbolIsActive ? "border-cyan/25 bg-cyan/[0.05]" : "border-white/[0.06] bg-black/40"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">{correlation.symbol}</p>
                                <p className="mt-1 text-xs text-zinc-500">{getAssetMeta(correlation.symbol).name}</p>
                              </div>
                              <span className="chip">{correlation.impactDirection}</span>
                            </div>
                            <p className="mt-3 text-xs text-zinc-500">
                              Impact score {Math.round(correlation.impactScore * 100)}%
                              {quote ? ` / ${formatCurrency(quote.price, quote.currency || "USD")}` : ""}
                              {quote ? ` / ${formatPct(quote.changePct)}` : ""}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button type="button" onClick={() => updateRoute({ symbol: correlation.symbol })} className={symbolIsActive ? "btn-primary" : "btn-secondary"}>
                                {symbolIsActive ? "Viewing chart" : "View chart"}
                              </button>
                              <Link href={`/stock/${correlation.symbol}`} className="btn-secondary">
                                Open asset file
                              </Link>
                              <button type="button" onClick={() => togglePinnedSymbol(correlation.symbol)} className="btn-secondary">
                                {workspace.pinnedSymbols.includes(correlation.symbol) ? "Unpin" : "Pin"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/[0.08] bg-black/35 px-4 py-10 text-center text-sm text-zinc-500">
                  Choose a story from the stream to inspect the linked assets.
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Market Lens" subtitle={activeSymbol ? `${activeSymbol} stays visible while you browse the linked news.` : "Select a linked asset from the story feed to load the chart."}>
              {activeSymbol ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/[0.06] bg-black/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-semibold text-white">{activeSymbol}</p>
                          <span className="chip">{lensMeta.assetClass}</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{lensMeta.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{lensMeta.focus}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">
                          {lensQuote ? formatCurrency(lensQuote.price, lensQuote.currency || "USD") : "No quote"}
                        </p>
                        <p className={`text-xs font-semibold ${lensQuote && lensQuote.changePct >= 0 ? "text-emerald" : "text-red-400"}`}>
                          {lensQuote ? formatPct(lensQuote.changePct) : "Awaiting quote"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/stock/${activeSymbol}`} className="btn-primary">
                        Open asset file
                      </Link>
                      <button type="button" onClick={() => togglePinnedSymbol(activeSymbol)} className="btn-secondary">
                        {workspace.pinnedSymbols.includes(activeSymbol) ? "Unpin symbol" : "Pin symbol"}
                      </button>
                    </div>
                  </div>

                  <TradingViewChart symbol={activeSymbol} height={360} />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-white/[0.06] bg-black/45 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Linked news</p>
                      <p className="mt-2 text-xl font-semibold text-white">{stockLens?.summary.totalEvents ?? lensNews.length}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/[0.06] bg-black/45 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Dominant bias</p>
                      <p className="mt-2 text-xl font-semibold text-white">{stockLens?.summary.dominantDirection || "Mixed"}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/[0.06] bg-black/45 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Pattern confidence</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {stockLens ? `${stockLens.summary.patternConfidence}%` : topPattern ? `${Math.round(topPattern.confidence * 100)}%` : "N/A"}
                      </p>
                    </div>
                  </div>

                  {topPattern ? (
                    <div className="rounded-[24px] border border-white/[0.06] bg-black/45 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Pattern read</p>
                      <p className="mt-3 text-sm leading-6 text-zinc-300">
                        {topPattern.eventCategory} stories have historically pushed {activeSymbol} {topPattern.direction} by {formatPct(topPattern.avgImpactPct)} with {Math.round(topPattern.confidence * 100)}% confidence across {topPattern.occurrences} linked cases.
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-white/[0.06] bg-black/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">News Affecting {activeSymbol}</p>
                        <p className="mt-2 text-sm text-zinc-400">
                          Start from the asset, then jump back into the event file or source article.
                        </p>
                      </div>
                      <span className="chip">{lensNews.length} linked stories</span>
                    </div>
                    {lensNews.length ? (
                      <div className="mt-4 space-y-3">
                        {lensNews.map((correlation) => (
                          <div key={correlation.id} className="rounded-[22px] border border-white/[0.06] bg-black/40 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  {correlation.event.source} / {correlation.event.region} / {relativeTime(correlation.event.publishedAt)}
                                </p>
                                <h3 className="mt-2 text-sm font-semibold text-white">
                                  <Link href={`/event/${correlation.event.id}`} className="!text-white hover:!text-cyan">
                                    {correlation.event.title}
                                  </Link>
                                </h3>
                              </div>
                              <span className="chip">{correlation.impactDirection}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                              {correlation.event.whyThisMatters || correlation.event.summary}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Link href={`/event/${correlation.event.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs">
                                Open event file
                              </Link>
                              {correlation.event.url ? (
                                <a href={correlation.event.url} target="_blank" rel="noreferrer" className="btn-secondary !px-3 !py-1.5 !text-xs">
                                  Open source article
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[22px] border border-dashed border-white/[0.08] bg-black/35 px-4 py-8 text-center text-sm text-zinc-500">
                        No linked stories are available for this symbol yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/[0.08] bg-black/35 px-4 py-10 text-center text-sm text-zinc-500">
                  Select a symbol from the story feed or affected-assets panel to load the chart.
                </div>
              )}
            </SectionCard>

            <SectionCard title="Top Risk Zones" subtitle="Keep the risk picture visible without turning the dashboard into a wall of summary cards.">
              <div className="space-y-3">
                {topRegions.map((region) => (
                  <button key={region.scopeKey} type="button" onClick={() => updateRoute({ region: region.scopeLabel })} className="w-full rounded-[22px] border border-white/[0.06] bg-black/45 p-4 text-left transition hover:border-cyan/20 hover:bg-cyan/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{region.scopeLabel}</p>
                        <p className="mt-1 text-xs text-zinc-500">{region.storyCount} stories / {region.narrativeCount} narratives</p>
                      </div>
                      <HeatBadge heatLevel={region.heatLevel} trend={region.trend} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-white/[0.06]">
                        <div className="h-2 rounded-full bg-gradient-to-r from-cyan via-emerald to-amber-400" style={{ width: `${Math.min(100, region.riskScore)}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{Math.round(region.riskScore)}/100</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {region.topSymbols.slice(0, 3).map((symbol) => (
                        <SymbolHoverCard key={`${region.scopeKey}-${symbol}`} symbol={symbol}>
                          <button type="button" onClick={(event) => { event.stopPropagation(); updateRoute({ symbol }); }} className="chip">{symbol}</button>
                        </SymbolHoverCard>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Top Movers" subtitle="Fast scan of the quoted moves already present in the surface.">
              <TopMoversCard quotes={quotes} />
            </SectionCard>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps = requireAuth;
