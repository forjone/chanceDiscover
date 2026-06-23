import { describe, it, expect } from "vitest";
import { scoreCluster, scoreTier, explainCluster } from "./scoring";
import type { ClusterResult } from "./clustering";
import type { Review } from "./types";

function review(content: string, rating: number, payIntent = 0): Review {
  return {
    id: Math.random(),
    appId: 1,
    externalId: null,
    author: null,
    title: null,
    content,
    rating,
    version: null,
    reviewDate: new Date().toISOString(),
    sentiment: -0.5,
    payIntent,
    createdAt: new Date().toISOString(),
    appName: "App",
  };
}

function cluster(over: Partial<ClusterResult> = {}): ClusterResult {
  const reviews = over.reviews ?? [review("bad", 1), review("bad", 2)];
  return {
    label: "x",
    keywords: ["x"],
    summary: "",
    reviewIds: reviews.map((r) => r.id),
    reviews,
    reviewCount: reviews.length,
    avgRating: 1.5,
    avgSentiment: -0.6,
    payIntentCount: reviews.filter((r) => r.payIntent).length,
    ...over,
  };
}

describe("scoreCluster", () => {
  it("keeps every dimension within 0-25 and total within 0-100", () => {
    const s = scoreCluster(cluster());
    for (const dim of ["demand", "payment", "gap", "timing"] as const) {
      expect(s[dim]).toBeGreaterThanOrEqual(0);
      expect(s[dim]).toBeLessThanOrEqual(25);
    }
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
  });

  it("rewards explicit payment intent", () => {
    const withPay = cluster({
      reviews: [review("I would pay for this", 2, 1), review("take my money", 1, 1)],
      payIntentCount: 2,
    });
    const without = cluster({
      reviews: [review("meh", 2, 0), review("ok", 1, 0)],
      payIntentCount: 0,
    });
    expect(scoreCluster(withPay).payment).toBeGreaterThan(scoreCluster(without).payment);
  });

  it("higher real trend momentum raises the timing score", () => {
    const lo = scoreCluster(cluster(), { trendMomentum: -1 });
    const hi = scoreCluster(cluster(), { trendMomentum: 1 });
    expect(hi.timing).toBeGreaterThan(lo.timing);
  });

  it("total is the documented weighted combination", () => {
    const s = scoreCluster(cluster());
    const expected =
      (s.demand * 0.25 + s.payment * 0.3 + s.gap * 0.3 + s.timing * 0.15) * 4;
    expect(Math.abs(s.total - expected)).toBeLessThan(0.5);
  });
});

describe("scoreTier", () => {
  it("maps score ranges to tiers", () => {
    expect(scoreTier(80).label).toBe("高潜力");
    expect(scoreTier(20).label).toBe("信号弱");
  });
});

describe("explainCluster", () => {
  it("gives reasons for every dimension", () => {
    const e = explainCluster(cluster());
    for (const dim of ["demand", "payment", "gap", "timing"] as const) {
      expect(Array.isArray(e[dim])).toBe(true);
      expect(e[dim].length).toBeGreaterThan(0);
    }
  });
  it("payment reasons reflect the presence of pay-intent", () => {
    const withPay = explainCluster(
      cluster({ reviews: [review("would pay", 1, 1)], payIntentCount: 1 })
    );
    expect(withPay.payment.join("")).toContain("付费");
  });
  it("timing reason notes the real signal source", () => {
    const e = explainCluster(cluster(), { trendMomentum: 0.5, youtubeKey: true });
    expect(e.timing.join("")).toContain("YouTube");
  });
});
