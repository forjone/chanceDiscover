import { describe, it, expect } from "vitest";
import { clusterReviews, signatureOf } from "./clustering";
import { sentiment, detectPayIntent } from "./nlp";
import type { Review } from "./types";

let nextId = 1;
function review(content: string, rating: number, title = ""): Review {
  return {
    id: nextId++,
    appId: 1,
    externalId: `t-${nextId}`,
    author: null,
    title: title || null,
    content,
    rating,
    version: null,
    reviewDate: new Date().toISOString(),
    sentiment: sentiment(`${title} ${content}`),
    payIntent: detectPayIntent(`${title} ${content}`).intent ? 1 : 0,
    createdAt: new Date().toISOString(),
    appName: "TestApp",
  };
}

describe("clusterReviews", () => {
  it("groups reviews sharing a pain theme", () => {
    const reviews = [
      review("the sync keeps failing and losing my data", 1, "sync broken"),
      review("sync is broken, lost my data again after update", 2, "data lost"),
      review("sync feature loses data every time", 1, "sync data loss"),
      review("ads everywhere, too many ads to use it", 2, "too many ads"),
      review("the ads are unbearable, ads ads ads", 1, "ads"),
    ];
    const clusters = clusterReviews(reviews);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    // The top cluster should be a coherent group of >= 2 reviews.
    expect(clusters[0].reviewCount).toBeGreaterThanOrEqual(2);
    expect(clusters[0].keywords.length).toBeGreaterThan(0);
  });

  it("computes aggregate stats per cluster", () => {
    const reviews = [
      review("crash on launch, crashes every time", 1, "crash"),
      review("app crashes constantly, unusable crash", 1, "crash"),
    ];
    const [c] = clusterReviews(reviews);
    expect(c.avgRating).toBe(1);
    expect(c.reviewCount).toBe(2);
  });

  it("assigns a stable, order-independent signature", () => {
    expect(signatureOf(["sync", "data", "loss"])).toBe(signatureOf(["loss", "sync", "data"]));
  });

  it("exposes a signature on each cluster for evolution tracking", () => {
    const reviews = [
      review("crash on launch every time, crashes", 1, "crash"),
      review("app crashes constantly, crash crash", 1, "crash"),
    ];
    const [c] = clusterReviews(reviews);
    expect(c.signature).toBeTruthy();
  });
});
