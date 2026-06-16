import { describe, it, expect } from "vitest";
import { generateCard } from "./cards";
import { opportunityToMarkdown } from "./markdown";
import type { ClusterResult } from "./clustering";
import type { Review, Opportunity } from "./types";

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
    reviewDate: "2026-06-01T00:00:00.000Z",
    sentiment: -0.5,
    payIntent,
    createdAt: new Date().toISOString(),
    appName: "DemoApp",
  };
}

const cluster: ClusterResult = (() => {
  const reviews = [
    review("offline mode missing, cannot use without internet", 2, 1),
    review("no offline support, useless on the subway", 1, 0),
  ];
  return {
    label: "offline",
    keywords: ["offline", "internet", "subway"],
    summary: "",
    reviewIds: reviews.map((r) => r.id),
    reviews,
    reviewCount: reviews.length,
    avgRating: 1.5,
    avgSentiment: -0.6,
    payIntentCount: 1,
  };
})();

describe("generateCard", () => {
  it("produces all required card fields", () => {
    const card = generateCard(cluster, { corpusSize: 10 });
    expect(card.title).toBeTruthy();
    expect(card.painPoint).toBeTruthy();
    expect(card.targetUsers).toBeTruthy();
    expect(card.existingSolutions).toBeTruthy();
    expect(card.gaps).toBeTruthy();
    expect(card.suggestedFormat).toBeTruthy();
    expect(card.reverseDiligence).toBeTruthy();
    expect(card.frequency).toBe(2);
    expect(card.evidence.length).toBeGreaterThan(0);
  });

  it("evidence carries the source app and rating", () => {
    const card = generateCard(cluster);
    expect(card.evidence[0].appName).toBe("DemoApp");
    expect(card.evidence[0].rating).toBeGreaterThanOrEqual(1);
  });
});

describe("opportunityToMarkdown", () => {
  it("renders headings and the reverse-diligence section", () => {
    const card = generateCard(cluster);
    const opp = {
      id: 1,
      runId: 1,
      clusterId: 1,
      ...card,
      status: "new",
      notes: "",
      createdAt: "",
    } as unknown as Opportunity;
    const md = opportunityToMarkdown(opp);
    expect(md).toContain("# ");
    expect(md).toContain("反向尽调");
    expect(md).toContain("代表性证据");
  });
});
