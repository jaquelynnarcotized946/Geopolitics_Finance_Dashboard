import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR("/api/alerts", fetcher);
  return {
    alerts: (data?.alerts ?? []) as Array<{ name: string; condition: string; status: string }>,
    isLoading,
    error,
    mutate,
  };
}
