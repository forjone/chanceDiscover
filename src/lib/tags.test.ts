import { describe, it, expect } from "vitest";
import { suggestTags } from "./tags";
import type { Opportunity } from "./types";

function opp(over: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 1, runId: 1, clusterId: 1,
    title: "解决「搜索与崩溃」的痛点工具",
    painPoint: "搜索很慢而且经常闪退崩溃",
    targetUsers: "", evidence: [], frequency: 3,
    existingSolutions: "", gaps: "缺少离线方案", suggestedFormat: "", reverseDiligence: "",
    score: { demand: 10, payment: 5, gap: 10, timing: 12, total: 40 },
    scoreExplain: { demand: [], payment: [], gap: [], timing: [] },
    status: "new", notes: "", tags: [], createdAt: "",
    ...over,
  };
}

describe("suggestTags", () => {
  it("derives theme tags from title/pain/gaps", () => {
    const tags = suggestTags(opp());
    expect(tags).toContain("搜索");
    expect(tags).toContain("稳定性");
    expect(tags).toContain("离线");
  });
  it("adds signal tags for strong scores", () => {
    const tags = suggestTags(opp({ score: { demand: 20, payment: 20, gap: 20, timing: 20, total: 80 }, frequency: 10 }));
    expect(tags).toContain("付费意愿强");
    expect(tags).toContain("高潜力");
    expect(tags).toContain("声量大");
  });
  it("excludes tags already applied", () => {
    const tags = suggestTags(opp({ tags: ["搜索"] }));
    expect(tags).not.toContain("搜索");
  });
});
