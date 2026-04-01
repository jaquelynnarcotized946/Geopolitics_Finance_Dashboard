import { recordSourceHealth } from "../ingest/sourceHealth";

export type GdeltEvent = {
  title: string;
  summary: string;
  source: string;
  url: string;
  feedGuid?: string;
  publishedAt: Date;
  region: string;
  countryCode?: string;
  severity: number;
};

const DEFAULT_QUERY = "conflict OR sanctions OR election OR protest";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  const startedAt = Date.now();
  const query = process.env.GDELT_QUERY || DEFAULT_QUERY;

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
    query,
  )}&mode=ArtList&maxrecords=20&format=json&sort=DateDesc&timespan=1d`;

  let response: Response | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(url, {
        headers: {
          "user-agent": "GeoPulse/1.0 (+https://geopolitics-finance-dashboard.vercel.app)",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      break;
    } catch (error) {
      lastError = (error as Error).message;
      console.warn(`[GDELT] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);

      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
      }
    }
  }

  if (!response || !response.ok) {
    await recordSourceHealth({
      source: "GDELT",
      feedUrl: url,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: lastError || "GDELT request failed",
    });
    return [];
  }

  const payload = (await response.json()) as {
    articles?: Array<{
      title?: string;
      seendate?: string;
      url?: string;
      sourcecountry?: string;
      sourcecountrycode?: string;
      sourcecountry_full?: string;
    }>;
  };

  await recordSourceHealth({
    source: "GDELT",
    feedUrl: url,
    status: "ok",
    latencyMs: Date.now() - startedAt,
  });

  return (payload.articles || [])
    .filter((article) => article.title && article.url)
    .map((article) => ({
      title: article.title as string,
      summary: "GDELT-sourced geopolitical signal.",
      source: "GDELT",
      url: article.url as string,
      feedGuid: article.url as string,
      publishedAt: article.seendate ? new Date(article.seendate) : new Date(),
      region: article.sourcecountry_full || "Global",
      countryCode: article.sourcecountrycode || article.sourcecountry,
      severity: 6,
    }));
}
