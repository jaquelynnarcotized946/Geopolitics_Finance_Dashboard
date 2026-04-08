import Link from "next/link";
import type { EventItem } from "../../lib/hooks/useEvents";
import type { Quote } from "../../lib/hooks/useQuotes";
import SeverityBadge from "../ui/SeverityBadge";
import SymbolHoverCard from "../ui/SymbolHoverCard";
import TrustSummary from "../ui/TrustSummary";
import { formatCurrency, formatPct, relativeTime } from "../../lib/format";
import { resolveCorrelationDisplay } from "../../lib/marketDisplay";
import { getQuoteBadgeLabel } from "../../lib/marketPresentation";

type Props = {
  events: EventItem[];
  quoteMap: Map<string, Quote>;
  emptyState?: {
    title: string;
    hint?: string;
  };
  selectedEventId?: string | null;
  activeSymbol?: string;
  onSelectEvent?: (eventId: string) => void;
};

export default function EventMarketPanel({
  events,
  quoteMap,
  emptyState,
  selectedEventId,
  activeSymbol,
  onSelectEvent,
}: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/[0.05] bg-black/35 p-8 text-center">
        <p className="text-sm text-zinc-400">
          {emptyState?.title ?? "No events with market correlations yet."}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          {emptyState?.hint ?? "Run data ingestion to populate events."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const correlations = event.correlations ?? [];
        const hasCorrelations = correlations.length > 0;
        const selected = selectedEventId === event.id;

        return (
          <div
            key={event.id}
            className={`rounded-[24px] border p-4 transition ${
              selected
                ? "border-cyan/25 bg-cyan/[0.05] shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                : "border-white/[0.06] bg-black/50 hover:border-white/[0.1] hover:bg-white/[0.02]"
            } ${onSelectEvent ? "cursor-pointer" : ""}`}
            onClick={onSelectEvent ? () => onSelectEvent(event.id) : undefined}
            role={onSelectEvent ? "button" : undefined}
            tabIndex={onSelectEvent ? 0 : undefined}
            onKeyDown={
              onSelectEvent
                ? (eventKey) => {
                    if (eventKey.key === "Enter" || eventKey.key === " ") {
                      eventKey.preventDefault();
                      onSelectEvent(event.id);
                    }
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                  <span>{event.source}</span>
                  <span>&#183;</span>
                  <span>{event.region}</span>
                  <span>&#183;</span>
                  <span>{relativeTime(event.publishedAt)}</span>
                  {event.category ? (
                    <>
                      <span>&#183;</span>
                      <span>{event.category.replace(/-/g, " ")}</span>
                    </>
                  ) : null}
                </div>
                <h3 className="mt-2 text-[15px] font-semibold leading-snug text-white">
                  <Link
                    href={`/event/${event.id}`}
                    onClick={(mouseEvent) => mouseEvent.stopPropagation()}
                    className="!text-white transition-colors hover:!text-cyan"
                  >
                    {event.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400 line-clamp-2">{event.summary}</p>
                {event.whyThisMatters ? (
                  <p className="mt-3 rounded-xl border border-cyan/10 bg-cyan/[0.04] px-3 py-2 text-[12px] leading-5 text-zinc-300">
                    <span className="mr-1 font-semibold text-cyan">Why it matters:</span>
                    {event.whyThisMatters}
                  </p>
                ) : null}
                <TrustSummary
                  className="mt-3"
                  compact
                  supportingSourcesCount={event.supportingSourcesCount}
                  sourceReliability={event.sourceReliability}
                  intelligenceQuality={event.intelligenceQuality}
                  publishedAt={event.publishedAt}
                  reliability={event.reliability}
                />
              </div>
              <SeverityBadge severity={event.severity ?? 1} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {hasCorrelations ? (
                correlations.slice(0, 5).map((corr) => {
                  const quote = quoteMap.get(corr.symbol);
                  const display = resolveCorrelationDisplay({
                    liveChange: quote?.changePct,
                    impactDirection: corr.impactDirection,
                    impactMagnitude: corr.impactMagnitude,
                  });
                  const change = display.change;
                  const isUp = change >= 0;
                  const badgeLabel = quote?.freshness
                    ? getQuoteBadgeLabel(quote.freshness)
                    : display.source;

                  return (
                    <SymbolHoverCard key={corr.id} symbol={corr.symbol}>
                      <Link
                        href={`/stock/${corr.symbol}`}
                        onClick={(mouseEvent) => mouseEvent.stopPropagation()}
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition ${
                          activeSymbol === corr.symbol
                            ? "border-cyan/30 bg-cyan/10"
                            : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isUp ? "bg-emerald" : "bg-red-400"}`} />
                        <span className="text-[11px] font-bold text-zinc-300">{corr.symbol}</span>
                        {quote && quote.price > 0 ? (
                          <span className="text-[10px] text-zinc-500">
                            {formatCurrency(quote.price, quote.currency || "USD")}
                          </span>
                        ) : null}
                        <span className={`text-[11px] font-bold ${isUp ? "text-emerald" : "text-red-400"}`}>
                          {formatPct(change)}
                        </span>
                        <span className="text-[9px] uppercase tracking-wide text-zinc-600">
                          {badgeLabel}
                        </span>
                      </Link>
                    </SymbolHoverCard>
                  );
                })
              ) : (
                <span className="chip">No linked assets yet</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/event/${event.id}`}
                onClick={(mouseEvent) => mouseEvent.stopPropagation()}
                className="btn-secondary !px-3 !py-1.5 !text-xs"
              >
                Open event file
              </Link>
              {event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(mouseEvent) => mouseEvent.stopPropagation()}
                  className="btn-secondary !px-3 !py-1.5 !text-xs"
                >
                  Open source article
                </a>
              ) : null}
              <span className="chip">{hasCorrelations ? `${correlations.length} affected assets` : "Awaiting market link"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
