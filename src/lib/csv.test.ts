import { describe, it, expect } from "vitest";
import { parseCsvReviews, parseDelimited, filterNewerThan, newestDate } from "./csv";
import type { RawReview } from "./collectors/appstore";

describe("parseDelimited", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseDelimited('a,"b, c","d ""e"""\n1,2,3', ",");
    expect(rows[0]).toEqual(["a", "b, c", 'd "e"']);
    expect(rows[1]).toEqual(["1", "2", "3"]);
  });
  it("handles newlines inside quoted fields", () => {
    const rows = parseDelimited('"line1\nline2",x', ",");
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe("line1\nline2");
  });
});

describe("parseCsvReviews", () => {
  it("maps English headers", () => {
    const out = parseCsvReviews("rating,title,content\n2,Crash,App crashes on launch\n5,Love it,Works great");
    expect(out).toHaveLength(2);
    expect(out[0].rating).toBe(2);
    expect(out[0].title).toBe("Crash");
    expect(out[0].content).toContain("crashes");
  });
  it("maps Chinese headers and reorders columns", () => {
    const out = parseCsvReviews("评论,评分,标题\n同步老是丢数据,1,同步问题");
    expect(out[0].rating).toBe(1);
    expect(out[0].title).toBe("同步问题");
    expect(out[0].content).toContain("丢数据");
  });
  it("auto-detects TSV", () => {
    const out = parseCsvReviews("rating\ttitle\tcontent\n3\tmeh\tit is ok");
    expect(out[0].rating).toBe(3);
    expect(out[0].content).toBe("it is ok");
  });
  it("falls back to positional columns without a header", () => {
    const out = parseCsvReviews("2,卡顿,用起来很卡");
    expect(out[0].rating).toBe(2);
    expect(out[0].content).toContain("很卡");
  });
  it("produces stable ids for identical rows (idempotent import)", () => {
    const a = parseCsvReviews("rating,content\n1,same review text");
    const b = parseCsvReviews("rating,content\n1,same review text");
    expect(a[0].externalId).toBe(b[0].externalId);
  });
  it("clamps out-of-range ratings", () => {
    const out = parseCsvReviews("rating,content\n9,too high\n-3,too low");
    expect(out[0].rating).toBe(5);
    expect(out[1].rating).toBe(0);
  });
});

function rv(date: string | null): RawReview {
  return { externalId: date || "x", author: null, title: null, content: "c", rating: 1, version: null, date };
}

describe("incremental watermark", () => {
  it("keeps only reviews newer than the watermark", () => {
    const reviews = [rv("2026-01-01T00:00:00Z"), rv("2026-03-01T00:00:00Z"), rv("2026-06-01T00:00:00Z")];
    const out = filterNewerThan(reviews, "2026-02-01T00:00:00Z");
    expect(out).toHaveLength(2);
  });
  it("keeps everything when no watermark", () => {
    expect(filterNewerThan([rv("2026-01-01T00:00:00Z")], null)).toHaveLength(1);
  });
  it("keeps reviews with unparseable dates", () => {
    expect(filterNewerThan([rv(null)], "2026-02-01T00:00:00Z")).toHaveLength(1);
  });
  it("newestDate returns the max date", () => {
    expect(newestDate([rv("2026-01-01T00:00:00Z"), rv("2026-06-01T00:00:00Z")])).toBe(
      new Date("2026-06-01T00:00:00Z").toISOString()
    );
  });
});
