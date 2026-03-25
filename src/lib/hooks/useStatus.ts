import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type IngestionStatus = {
  lastIngestion: {
    status: string;
    eventsFound: number;
    startedAt: string;
    completedAt: string | null;
    error: string | null;
  } | null;
  stats: {
    totalEvents: number;
    recentEvents24h: number;
    totalCorrelations: number;
    totalPatterns: number;
  };
};

export function useStatus() {
  const { data, error, isLoading, mutate } = useSWR<IngestionStatus>("/api/status", fetcher, {
    refreshInterval: 60000,
  });

  return {
    status: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
