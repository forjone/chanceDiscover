"use client";

import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import { opportunityToMarkdown } from "@/lib/markdown";
import type { Opportunity } from "@/lib/types";

export default function ExportButton({ opportunity }: { opportunity: Opportunity }) {
  const [copied, setCopied] = useState(false);
  const md = opportunityToMarkdown(opportunity);

  async function copy() {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable over http */
    }
  }

  function download() {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opportunity-${opportunity.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={copy} className="btn-ghost px-3 py-1.5 text-xs">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "已复制" : "复制 Markdown"}
      </button>
      <button onClick={download} className="btn-ghost px-3 py-1.5 text-xs">
        <Download className="h-3.5 w-3.5" /> 导出 .md
      </button>
    </div>
  );
}
