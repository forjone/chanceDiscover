import { fetchAppStoreReviews, lookupApp } from "./collectors/appstore";
import { fetchGooglePlayReviews, lookupGooglePlayApp } from "./collectors/googleplay";
import { ingestReviews } from "./ingest";
import type { Platform } from "./types";

export interface CollectInput {
  platform: Platform;
  storeId: string;
  country?: string;
  appName?: string | null;
  category?: string | null;
  iconUrl?: string | null;
}

export interface CollectResult {
  ok: boolean;
  app?: string;
  inserted: number;
  total: number;
  note?: string;
  error?: string;
}

// Harvests real reviews from a store and ingests them. Shared by the single
// collect endpoint and the "refresh all sources" monitoring action.
export async function collectAppReviews(input: CollectInput): Promise<CollectResult> {
  const country = input.country || process.env.APPSTORE_COUNTRY || "us";
  let meta = input.appName
    ? { storeId: input.storeId, name: input.appName, category: input.category ?? null, iconUrl: input.iconUrl ?? null }
    : null;
  if (!meta) {
    meta =
      input.platform === "googleplay"
        ? await lookupGooglePlayApp(input.storeId)
        : await lookupApp(input.storeId, country);
  }
  if (!meta) return { ok: false, inserted: 0, total: 0, error: "无法解析应用信息" };

  const raw =
    input.platform === "googleplay"
      ? await fetchGooglePlayReviews(input.storeId, country, 200)
      : await fetchAppStoreReviews(input.storeId, country, 8);

  if (raw.length === 0) {
    return {
      ok: true,
      app: meta.name,
      inserted: 0,
      total: 0,
      note:
        input.platform === "googleplay"
          ? "Google Play 抓取依赖可选依赖，若为空可改用 App Store 或手动录入。"
          : "未获取到评论，请尝试其它地区或稍后重试。",
    };
  }

  const result = await ingestReviews({
    appName: meta.name,
    platform: input.platform,
    storeId: input.storeId,
    country,
    category: meta.category,
    iconUrl: meta.iconUrl,
    reviews: raw,
  });
  return { ok: true, app: meta.name, inserted: result.inserted, total: result.total };
}
