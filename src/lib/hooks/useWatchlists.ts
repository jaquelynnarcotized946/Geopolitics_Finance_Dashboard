import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWatchlists() {
  const { data, error, isLoading, mutate } = useSWR("/api/watchlists", fetcher);
  return {
    watchlists: (data?.watchlists ?? []) as Array<{
      id: string;
      name: string;
      items: Array<{ id: string; symbol: string; name: string; assetClass: string; countryCode?: string }>;
    }>,
    isLoading,
    error,
    mutate,
  };
}
