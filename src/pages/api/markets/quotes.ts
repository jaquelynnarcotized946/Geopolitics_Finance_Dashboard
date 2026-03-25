import type { NextApiRequest, NextApiResponse } from "next";
import { fetchQuotes, type MarketQuote } from "../../../lib/sources/yahoo";

// Server-side cache to avoid hammering Google Finance
let cache: { quotes: MarketQuote[]; timestamp: number; key: string } | null = null;
const CACHE_TTL = 120_000; // 2 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const symbols = (req.query.symbols as string | undefined)?.split(",").filter(Boolean) || [];
  if (symbols.length === 0) {
    res.status(400).json({ error: "symbols query required" });
    return;
  }

  const cacheKey = symbols.sort().join(",");

  // Return cached data if fresh enough
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    res.status(200).json({ quotes: cache.quotes, cached: true });
    return;
  }

  try {
    const quotes = await fetchQuotes(symbols);
    // Only cache if we got real data
    if (quotes.some((q) => q.price > 0)) {
      cache = { quotes, timestamp: Date.now(), key: cacheKey };
    }
    res.status(200).json({ quotes });
  } catch (error) {
    // Return stale cache on error
    if (cache) {
      res.status(200).json({ quotes: cache.quotes, cached: true, stale: true });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
}
