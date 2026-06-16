import { describe, it, expect } from "vitest";
import { sentiment, detectPayIntent, extractKeywords, tokenize } from "./nlp";

describe("sentiment", () => {
  it("scores negative text below zero", () => {
    expect(sentiment("This app keeps crashing, terrible and useless")).toBeLessThan(0);
  });
  it("scores positive text above zero", () => {
    expect(sentiment("I love this, it's great and works perfectly")).toBeGreaterThan(0);
  });
  it("handles Chinese negative words", () => {
    expect(sentiment("总是闪退，太卡了，真垃圾")).toBeLessThan(0);
  });
  it("is bounded to [-1, 1]", () => {
    const s = sentiment("crash bug broken terrible awful worst hate useless garbage");
    expect(s).toBeGreaterThanOrEqual(-1);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("detectPayIntent", () => {
  it("detects explicit willingness to pay (EN)", () => {
    expect(detectPayIntent("I would gladly pay for an offline version").intent).toBe(true);
  });
  it("detects Chinese payment intent", () => {
    expect(detectPayIntent("愿意付费支持离线功能").intent).toBe(true);
  });
  it("returns false for neutral text", () => {
    expect(detectPayIntent("the weather is nice today").intent).toBe(false);
  });
  it("strong signals weigh more than weak ones", () => {
    const strong = detectPayIntent("take my money").strength;
    const weak = detectPayIntent("the price is fine").strength;
    expect(strong).toBeGreaterThan(weak);
  });
});

describe("tokenize / extractKeywords", () => {
  it("drops stop words", () => {
    expect(tokenize("the app is a great tool")).not.toContain("the");
  });
  it("surfaces recurring terms as keywords", () => {
    const docs = [
      "sync keeps failing and losing my data",
      "sync is broken, data lost again",
      "the sync feature loses data constantly",
    ];
    const terms = extractKeywords(docs, 5).map((k) => k.term);
    expect(terms).toContain("sync");
  });
});
