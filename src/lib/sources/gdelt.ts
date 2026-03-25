export type GdeltEvent = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  region: string;
  countryCode?: string;
  severity: number;
};

const DEFAULT_QUERY = "conflict OR sanctions OR election OR protest";

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  const query = process.env.GDELT_QUERY || DEFAULT_QUERY;

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
    query,
  )}&mode=ArtList&maxrecords=20&format=json&sort=DateDesc&timespan=1d`;

  const response = await fetch(url);
  if (!response.ok) {
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

  return (payload.articles || [])
    .filter((article) => article.title && article.url)
    .map((article) => ({
      title: article.title as string,
      summary: "GDELT-sourced geopolitical signal.",
      source: "GDELT",
      url: article.url as string,
      publishedAt: article.seendate ? new Date(article.seendate) : new Date(),
      region: article.sourcecountry_full || "Global",
      countryCode: article.sourcecountrycode || article.sourcecountry,
      severity: 6,
    }));
}
