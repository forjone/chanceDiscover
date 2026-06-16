"use client";

import { useEffect, useState } from "react";
import { FileText, LayoutTemplate, ListChecks, Globe, Loader2, RefreshCw, Copy, Check, Download, Sparkles } from "lucide-react";
import Markdown from "@/components/Markdown";
import { ARTIFACT_LABELS, type Artifact, type ArtifactType } from "@/lib/types";

const TABS: { type: ArtifactType; icon: React.ReactNode }[] = [
  { type: "prd", icon: <FileText className="h-3.5 w-3.5" /> },
  { type: "landing", icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
  { type: "tasks", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { type: "research", icon: <Globe className="h-3.5 w-3.5" /> },
];

export default function ArtifactsPanel({ id }: { id: number }) {
  const [active, setActive] = useState<ArtifactType>("prd");
  const [byType, setByType] = useState<Partial<Record<ArtifactType, Artifact>>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/opportunities/${id}/artifacts`)
      .then((r) => r.json())
      .then((d) => {
        const map: Partial<Record<ArtifactType, Artifact>> = {};
        for (const a of d.artifacts || []) map[a.type as ArtifactType] = a;
        setByType(map);
      });
  }, [id]);

  const current = byType[active];

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${id}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: active }),
      });
      const d = await res.json();
      if (d.content) {
        setByType((m) => ({ ...m, [active]: { oppTitle: "", type: active, content: d.content, source: d.source, createdAt: new Date().toISOString() } }));
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!current) return;
    await navigator.clipboard.writeText(current.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    if (!current) return;
    const blob = new Blob([current.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active}-${id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card mt-6 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
        <Sparkles className="h-4 w-4 text-ore-400" /> 落地工具箱
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setActive(t.type)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
              active === t.type ? "bg-ore-500 text-rock-950" : "border border-rock-700 text-rock-400 hover:bg-rock-800"
            } ${byType[t.type] ? "ring-1 ring-emerald-500/30" : ""}`}
          >
            {t.icon} {ARTIFACT_LABELS[t.type]}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-rock-500">
          {current
            ? `${current.source === "llm" ? "Claude 生成" : "模板生成"} · ${current.createdAt.slice(0, 10)}`
            : "尚未生成"}
        </div>
        <div className="flex items-center gap-2">
          {current && (
            <>
              <button onClick={copy} className="btn-ghost px-2.5 py-1 text-xs">
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
              <button onClick={download} className="btn-ghost px-2.5 py-1 text-xs">
                <Download className="h-3 w-3" />
              </button>
            </>
          )}
          <button onClick={generate} disabled={loading} className="btn-primary px-3 py-1.5 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : current ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? "生成中…" : current ? "重新生成" : "生成"}
          </button>
        </div>
      </div>

      {current ? (
        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-rock-800 bg-rock-950/40 p-4">
          <Markdown content={current.content} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-rock-800 px-4 py-8 text-center text-sm text-rock-500">
          点击「生成」把这个机会变成 {ARTIFACT_LABELS[active]}。
          <br />
          <span className="text-xs">配置 ANTHROPIC_API_KEY 后由 Claude 生成（反向尽调会联网核查竞品），否则用模板。</span>
        </p>
      )}
    </div>
  );
}
