import { describe, it, expect } from "vitest";
import { alertText } from "./report";

describe("alertText", () => {
  it("summarizes new opportunities with scores", () => {
    const t = alertText([
      { title: "搜索工具", total: 81 },
      { title: "崩溃修复", total: 76.4 },
    ]);
    expect(t).toContain("2 个");
    expect(t).toContain("搜索工具");
    expect(t).toContain("81");
    expect(t).toContain("76"); // rounded
  });
});
