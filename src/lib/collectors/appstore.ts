// App Store review harvesting via the public customer-reviews RSS (JSON) feed.
// No API key required. Also resolves app metadata via the iTunes Search API.

export interface RawReview {
  externalId: string;
  author: string | null;
  title: string | null;
  content: string;
  rating: number;
  version: string | null;
  date: string | null;
}

export interface AppMeta {
  storeId: string;
  name: string;
  category: string | null;
  iconUrl: string | null;
}

// Search the App Store for an app by name, returns best matches.
export async function searchAppStore(term: string, country = "us"): Promise<AppMeta[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=8`;
  const res = await fetch(url, { headers: { "User-Agent": "OpportunityMiner/0.1" } });
  if (!res.ok) throw new Error(`App Store search failed: ${res.status}`);
  const data = (await res.json()) as { results: Record<string, unknown>[] };
  return (data.results || []).map((r) => ({
    storeId: String(r.trackId),
    name: String(r.trackName),
    category: r.primaryGenreName ? String(r.primaryGenreName) : null,
    iconUrl: r.artworkUrl100 ? String(r.artworkUrl100) : null,
  }));
}

export async function lookupApp(storeId: string, country = "us"): Promise<AppMeta | null> {
  const url = `https://itunes.apple.com/lookup?id=${storeId}&country=${country}`;
  const res = await fetch(url, { headers: { "User-Agent": "OpportunityMiner/0.1" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { results: Record<string, unknown>[] };
  const r = data.results?.[0];
  if (!r) return null;
  return {
    storeId,
    name: String(r.trackName),
    category: r.primaryGenreName ? String(r.primaryGenreName) : null,
    iconUrl: r.artworkUrl100 ? String(r.artworkUrl100) : null,
  };
}

// Fetch up to `pages` of recent reviews (RSS caps at ~10 pages, 50/page).
export async function fetchAppStoreReviews(
  storeId: string,
  country = "us",
  pages = 5
): Promise<RawReview[]> {
  const out: RawReview[] = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${storeId}/sortby=mostrecent/json`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": "OpportunityMiner/0.1" } });
    } catch {
      break;
    }
    if (!res.ok) break;
    const data = (await res.json()) as { feed?: { entry?: unknown } };
    const entries = data.feed?.entry;
    if (!entries) break;
    const list = Array.isArray(entries) ? entries : [entries];
    // The first entry on page 1 is the app metadata, not a review.
    for (const e of list) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const entry = e as any;
      if (!entry["im:rating"]) continue;
      out.push({
        externalId: entry.id?.label || `${storeId}-${out.length}`,
        author: entry.author?.name?.label ?? null,
        title: entry.title?.label ?? null,
        content: entry.content?.label ?? "",
        rating: Number(entry["im:rating"]?.label || 0),
        version: entry["im:version"]?.label ?? null,
        date: entry.updated?.label ?? null,
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
    if (list.length < 2) break;
  }
  return out;
}
