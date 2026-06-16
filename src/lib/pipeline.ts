import {
  allReviewsForAnalysis,
  createRun,
  finishRun,
  insertCluster,
  insertOpportunity,
  clearGeneratedArtifacts,
  upsertTrend,
} from "@/db/repo";
import { clusterReviews } from "./clustering";
import { generateCard } from "./cards";
import { getTrendSignal } from "./collectors/youtube";

// Runs the full mining pipeline: reviews -> pain clusters -> trend signals ->
// scored opportunity cards. Persists clusters, opportunities and trends, and
// records an execution run for longitudinal history.
export async function runPipeline(): Promise<{
  runId: number;
  clusters: number;
  opportunities: number;
  log: string[];
}> {
  const runId = await createRun("pipeline", {});
  const log: string[] = [];
  try {
    const reviews = await allReviewsForAnalysis();
    log.push(`载入 ${reviews.length} 条评论用于分析`);
    if (reviews.length === 0) {
      await finishRun(runId, "completed", { clusters: 0, opportunities: 0 }, log.join("\n"));
      return { runId, clusters: 0, opportunities: 0, log };
    }

    // Fresh artifacts each run; raw reviews/apps are preserved.
    await clearGeneratedArtifacts();

    const clusters = clusterReviews(reviews);
    log.push(`聚类出 ${clusters.length} 个痛点簇`);

    let oppCount = 0;
    for (const cluster of clusters) {
      const clusterId = await insertCluster(runId, {
        label: cluster.label,
        keywords: cluster.keywords,
        summary: cluster.summary,
        reviewCount: cluster.reviewCount,
        avgRating: cluster.avgRating,
        avgSentiment: cluster.avgSentiment,
        payIntentCount: cluster.payIntentCount,
        reviewIds: cluster.reviewIds,
      });

      // Real timing signal from the cluster's leading keyword.
      const keyword = cluster.keywords[0] || cluster.label;
      const signal = await getTrendSignal(keyword, reviews);
      await upsertTrend({
        keyword,
        source: signal.source,
        momentum: signal.momentum,
        dataPoints: signal.dataPoints,
      });

      const card = generateCard(cluster, {
        trendMomentum: signal.momentum,
        corpusSize: reviews.length,
      });
      await insertOpportunity(runId, clusterId, card);
      oppCount++;
    }

    log.push(`生成 ${oppCount} 张机会卡片`);
    await finishRun(
      runId,
      "completed",
      { clusters: clusters.length, opportunities: oppCount, reviews: reviews.length },
      log.join("\n")
    );
    return { runId, clusters: clusters.length, opportunities: oppCount, log };
  } catch (err) {
    log.push(`错误: ${(err as Error).message}`);
    await finishRun(runId, "failed", {}, log.join("\n"));
    throw err;
  }
}
