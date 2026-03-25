import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type Quote = {
  symbol: string;
  price: number;
  changePct: number;
  currency?: string;
};

export function useQuotes(symbols: string[]) {
  const query = symbols.length ? `/api/markets/quotes?symbols=${symbols.join(",")}` : null;
  const { data, error, isLoading } = useSWR(query, fetcher, {
    refreshInterval: 300000,
  });

  return {
    quotes: (data?.quotes ?? []) as Quote[],
    isLoading,
    error,
  };
}
