import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type Pattern = {
  id: string;
  eventCategory: string;
  symbol: string;
  avgImpactPct: number;
  direction: string;
  confidence: number;
  occurrences: number;
};

export function usePatterns(category?: string) {
  const url = category ? `/api/patterns?category=${category}` : "/api/patterns";
  const { data, error, isLoading } = useSWR(url, fetcher, {
    refreshInterval: 300000,
  });

  return {
    patterns: (data?.patterns ?? []) as Pattern[],
    isLoading,
    error,
  };
}
