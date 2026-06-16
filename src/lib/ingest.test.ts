import { describe, it, expect } from "vitest";
import { parseManualReviews } from "./ingest";

describe("parseManualReviews", () => {
  it("parses 'rating | title | body' rows", () => {
    const out = parseManualReviews("2 | 闪退 | 一打开就崩溃\n1 | 卡 | 太卡了用不了");
    expect(out).toHaveLength(2);
    expect(out[0].rating).toBe(2);
    expect(out[0].title).toBe("闪退");
    expect(out[0].content).toContain("崩溃");
  });

  it("parses 'rating | body' without a title", () => {
    const out = parseManualReviews("3 | 同步经常丢数据");
    expect(out[0].rating).toBe(3);
    expect(out[0].title).toBeNull();
    expect(out[0].content).toContain("同步");
  });

  it("treats plain lines as zero-rated reviews", () => {
    const out = parseManualReviews("广告太多了\n导出很麻烦");
    expect(out).toHaveLength(2);
    expect(out[0].rating).toBe(0);
  });

  it("ignores empty input", () => {
    expect(parseManualReviews("   \n  \n")).toHaveLength(0);
  });

  it("assigns unique external ids", () => {
    const out = parseManualReviews("a\nb\nc");
    const ids = new Set(out.map((r) => r.externalId));
    expect(ids.size).toBe(3);
  });
});
