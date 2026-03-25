import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type CorrelationItem = {
  id: string;
  symbol: string;
  impactScore: number;
  impactDirection: string;
  impactMagnitude: number;
  window: string;
};

export type EventItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  region: string;
  countryCode?: string;
  publishedAt: string;
  severity?: number;
  sentimentScore?: number | null;
  sentimentLabel?: string | null;
  url?: string;
  correlations?: CorrelationItem[];
};

export function useEvents() {
  const { data, error, isLoading } = useSWR("/api/events?take=200", fetcher, {
    refreshInterval: 120000, // 2 min refresh
  });
  return {
    events: (data?.events ?? []) as EventItem[],
    isLoading,
    error,
  };
}
