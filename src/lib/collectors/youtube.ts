// Trend momentum. Per the spec, timing must reflect *real* heat trajectory, not
// AI speculation. When a YouTube Data API key exists we use genuine publish-rate
// signals; otherwise we fall back to the real slope of our own review volume.

import type { Review, TrendPoint } from "@/lib/types";

export interface TrendSignal {
  keyword: string;
  source: "youtube" | "reviews";
  momentum: number; // -1 .. 1
  dataPoints: TrendPoint[];
}

// Slope of a series normalized to -1..1 (compares recent half vs earlier half).
function momentumFromSeries(points: TrendPoint[]): number {
  if (points.length < 2) return 0;
  const mid = Math.floor(points.length / 2);
  const earlier = points.slice(0, mid).reduce((s, p) => s + p.value, 0) / Math.max(1, mid);
  const recent = points.slice(mid).reduce((s, p) => s + p.value, 0) / Math.max(1, points.length - mid);
  if (earlier === 0 && recent === 0) return 0;
  const ratio = (recent - earlier) / (earlier + recent);
  return Math.max(-1, Math.min(1, ratio * 2));
}

// Fetch real YouTube publish-volume for a keyword over recent windows.
async function youtubeSignal(keyword: string, apiKey: string): Promise<TrendSignal | null> {
  const now = Date.now();
  const windows = [90, 60, 30, 14, 7]; // days ago, oldest -> newest boundaries
  const points: TrendPoint[] = [];
  try {
    for (let i = 0; i < windows.length - 1; i++) {
      const after = new Date(now - windows[i] * 864e5).toISOString();
      const before = new Date(now - windows[i + 1] * 864e5).toISOString();
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=0` +
        `&q=${encodeURIComponent(keyword)}&publishedAfter=${after}&publishedBefore=${before}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as { pageInfo?: { totalResults?: number } };
      points.push({
        date: before.slice(0, 10),
        value: Number(data.pageInfo?.totalResults || 0),
      });
    }
  } catch {
    return null;
  }
  return { keyword, source: "youtube", momentum: momentumFromSeries(points), dataPoints: points };
}

// Derive momentum from our own review timeline for a keyword (always available).
function reviewSignal(keyword: string, reviews: Review[]): TrendSignal {
  const matched = reviews.filter((r) =>
    `${r.title || ""} ${r.content}`.toLowerCase().includes(keyword.toLowerCase())
  );
  // Bucket by week over the last ~12 weeks.
  const buckets = new Map<string, number>();
  const now = Date.now();
  for (const r of matched) {
    const t = r.reviewDate ? Date.parse(r.reviewDate) : Date.parse(r.createdAt);
    if (isNaN(t)) continue;
    const weeksAgo = Math.floor((now - t) / (7 * 864e5));
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    const key = String(11 - weeksAgo).padStart(2, "0");
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const points: TrendPoint[] = [];
  for (let w = 0; w < 12; w++) {
    const key = String(w).padStart(2, "0");
    const date = new Date(now - (11 - w) * 7 * 864e5).toISOString().slice(0, 10);
    points.push({ date, value: buckets.get(key) || 0 });
  }
  return { keyword, source: "reviews", momentum: momentumFromSeries(points), dataPoints: points };
}

export async function getTrendSignal(keyword: string, reviews: Review[]): Promise<TrendSignal> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    const yt = await youtubeSignal(keyword, apiKey);
    if (yt && yt.dataPoints.some((p) => p.value > 0)) return yt;
  }
  return reviewSignal(keyword, reviews);
}
