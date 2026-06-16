// Google Play review harvesting via the `google-play-scraper` package.
// Loaded dynamically so a missing/unavailable dependency degrades gracefully
// instead of breaking the whole server bundle.

import type { RawReview, AppMeta } from "./appstore";

// The package ships an ESM default-export object whose method surface is awkward
// to type through a dynamic import; treat it loosely since it's optional at runtime.
/* eslint-disable @typescript-eslint/no-explicit-any */
type GPlay = any;

async function load(): Promise<GPlay | null> {
  try {
    const mod: any = await import("google-play-scraper");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export async function searchGooglePlay(term: string): Promise<AppMeta[]> {
  const gplay = await load();
  if (!gplay) return [];
  const results = await gplay.search({ term, num: 8 });
  return results.map((r: any) => ({
    storeId: r.appId,
    name: r.title,
    category: null,
    iconUrl: r.icon ?? null,
  }));
}

export async function lookupGooglePlayApp(appId: string): Promise<AppMeta | null> {
  const gplay = await load();
  if (!gplay) return null;
  try {
    const app = await gplay.app({ appId });
    return {
      storeId: app.appId,
      name: app.title,
      category: app.genre ?? null,
      iconUrl: app.icon ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchGooglePlayReviews(
  appId: string,
  country = "us",
  count = 200
): Promise<RawReview[]> {
  const gplay = await load();
  if (!gplay) return [];
  try {
    const res = await gplay.reviews({
      appId,
      country,
      sort: gplay.sort.NEWEST,
      num: count,
    });
    const data = Array.isArray(res) ? res : res.data;
    return data.map((r: any) => ({
      externalId: r.id,
      author: r.userName ?? null,
      title: null,
      content: r.text ?? "",
      rating: Number(r.score || 0),
      version: r.version ?? null,
      date: r.date ? new Date(r.date).toISOString() : null,
    }));
  } catch {
    return [];
  }
}
