// Seed demo data so the system is explorable without live collection.
// Run with: npm run seed
import { ensureSchema } from "./client";
import { ingestReviews } from "@/lib/ingest";
import { runPipeline } from "@/lib/pipeline";
import type { RawReview } from "@/lib/collectors/appstore";

// Stable externalId (title + rating) keeps re-seeding idempotent — no duplicate rows.
function mk(rating: number, title: string, content: string, daysAgo = 0): RawReview {
  return {
    externalId: `seed-${rating}-${title}`,
    author: null,
    title,
    content,
    rating,
    version: null,
    date: new Date(Date.now() - daysAgo * 864e5).toISOString(),
  };
}

const DATASETS = [
  {
    appName: "NoteFlow",
    storeId: "seed-noteflow",
    reviews: [
      mk(2, "同步太不靠谱", "多设备同步经常丢数据，换手机后笔记全没了，太可怕了", 3),
      mk(1, "又丢笔记了", "同步冲突直接覆盖，辛苦写的内容没了，根本不敢用来记重要东西", 6),
      mk(2, "离线打不开", "没网就完全打不开，出差时根本用不了，希望能支持离线", 10),
      mk(3, "离线模式呢", "为什么还不做离线功能，地铁里想看笔记都看不了", 12),
      mk(2, "导出太麻烦", "数据导出步骤太复杂，格式也少，希望能一键导出 PDF 和 Markdown", 8),
      mk(1, "导出失败", "点导出经常卡住，大文件直接失败，根本导不出来", 15),
      mk(4, "愿意付费买离线", "整体不错，如果能离线我马上就订阅，愿意付费支持", 2),
    ],
  },
  {
    appName: "FitTrack",
    storeId: "seed-fittrack",
    reviews: [
      mk(2, "总是闪退", "每次记录运动几分钟就崩溃闪退，好几个版本了还不修", 4),
      mk(1, "崩溃严重", "一打开就闪退，重装也没用，数据全丢了", 7),
      mk(2, "广告太多", "免费版广告多到没法忍，想去广告还要订阅，太贵了", 5),
      mk(1, "付费才去广告", "什么都要付费，免费版几乎没法用，定价也离谱", 9),
      mk(3, "同步不准", "和手表的数据同步经常对不上，步数差很多", 11),
      mk(4, "可以付费去广告", "功能挺好，如果一次性买断去广告我很乐意付费", 1),
    ],
  },
  {
    appName: "InvoicePro",
    storeId: "seed-invoicepro",
    reviews: [
      mk(2, "导出格式太少", "只能导出一种格式，客户要的格式不支持，每次都要手动转", 6),
      mk(1, "导出 PDF 排版乱", "导出的 PDF 排版全乱了，发给客户很尴尬", 10),
      mk(2, "离线不能用", "没网就开不了发票，外出拜访客户时特别不方便", 13),
      mk(5, "强烈推荐", "对小企业太友好了，就是希望多点导出格式，愿意为高级版付费", 2),
      mk(3, "贵了点", "订阅价格偏高，对独立接活的人来说有点肉疼", 8),
    ],
  },
];

async function main() {
  await ensureSchema();
  for (const ds of DATASETS) {
    const res = await ingestReviews({
      appName: ds.appName,
      platform: "appstore",
      storeId: ds.storeId,
      country: "us",
      reviews: ds.reviews,
    });
    console.log(`Seeded ${ds.appName}: +${res.inserted} reviews`);
  }
  const result = await runPipeline();
  console.log(`Pipeline: ${result.clusters} clusters, ${result.opportunities} opportunities`);
  console.log("Done. Run `npm run dev` and open http://localhost:3000");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
