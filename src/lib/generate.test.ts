import { describe, it, expect, beforeEach } from "vitest";
import { generateArtifact } from "./generate";
import type { Opportunity } from "./types";

const opp: Opportunity = {
  id: 1, runId: 1, clusterId: 1,
  title: "解决离线痛点的工具",
  painPoint: "用户无法离线使用",
  targetUsers: "经常在地铁里用的人",
  evidence: [{ appName: "DemoApp", rating: 1, snippet: "没网就打不开" }],
  frequency: 5,
  existingSolutions: "现有方案都要联网",
  gaps: "缺少轻量离线方案",
  suggestedFormat: "一个离线优先的小工具",
  reverseDiligence: "大厂觉得太小",
  score: { demand: 20, payment: 18, gap: 19, timing: 14, total: 72 },
  status: "new", notes: "", createdAt: "",
};

describe("generateArtifact (offline template fallback)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY; // force template path
  });

  it("produces a PRD with key sections", async () => {
    const { content, source } = await generateArtifact(opp, "prd");
    expect(source).toBe("template");
    expect(content).toContain("PRD");
    expect(content).toContain("MVP 功能范围");
  });

  it("produces a task checklist with checkboxes", async () => {
    const { content } = await generateArtifact(opp, "tasks");
    expect(content).toContain("- [ ]");
  });

  it("covers every artifact type offline", async () => {
    for (const t of ["prd", "landing", "tasks", "research"] as const) {
      const { content } = await generateArtifact(opp, t);
      expect(content.length).toBeGreaterThan(50);
    }
  });
});
