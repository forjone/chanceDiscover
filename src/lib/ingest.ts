import { upsertApp, insertReview, advanceWatermark } from "@/db/repo";
import { sentiment, detectPayIntent } from "./nlp";
import { newestDate } from "./csv";
import type { Platform } from "./types";
import type { RawReview } from "./collectors/appstore";

// Enriches raw reviews with sentiment + pay-intent heuristics and persists them
// under their app. Returns how many new rows were actually inserted.
export async function ingestReviews(input: {
  appName: string;
  platform: Platform;
  storeId: string;
  country?: string;
  category?: string | null;
  iconUrl?: string | null;
  reviews: RawReview[];
}): Promise<{ appId: number; inserted: number; total: number }> {
  const app = await upsertApp({
    name: input.appName,
    platform: input.platform,
    storeId: input.storeId,
    country: input.country,
    category: input.category ?? null,
    iconUrl: input.iconUrl ?? null,
  });

  let inserted = 0;
  for (const r of input.reviews) {
    const text = `${r.title || ""} ${r.content}`.trim();
    if (!text) continue;
    const s = sentiment(text);
    const pay = detectPayIntent(text);
    const id = await insertReview({
      appId: app.id,
      externalId: r.externalId,
      author: r.author,
      title: r.title,
      content: r.content,
      rating: r.rating,
      version: r.version,
      reviewDate: r.date,
      sentiment: s,
      payIntent: pay.intent ? 1 : 0,
    });
    if (id > 0) inserted++;
  }
  // Advance the incremental-collection watermark to the newest review seen.
  await advanceWatermark(app.id, newestDate(input.reviews));
  return { appId: app.id, inserted, total: input.reviews.length };
}

// Parses pasted free-text reviews for the manual MVP path. Supports two formats:
//   1) "5 | Title | body text"  (rating | optional title | content)
//   2) one review per line / blank-line separated paragraphs (rating inferred).
export function parseManualReviews(raw: string): RawReview[] {
  const out: RawReview[] = [];
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const units = blocks.length > 1 ? blocks : raw.split(/\n/).map((l) => l.trim()).filter(Boolean);

  units.forEach((unit, i) => {
    const parts = unit.split("|").map((p) => p.trim());
    let rating = 0;
    let title: string | null = null;
    let content = unit;
    if (parts.length >= 2 && /^[1-5]$/.test(parts[0])) {
      rating = Number(parts[0]);
      if (parts.length >= 3) {
        title = parts[1] || null;
        content = parts.slice(2).join(" | ");
      } else {
        content = parts.slice(1).join(" | ");
      }
    }
    if (!content) return;
    out.push({
      externalId: `manual-${Date.now()}-${i}`,
      author: null,
      title,
      content,
      rating,
      version: null,
      date: new Date().toISOString(),
    });
  });
  return out;
}
