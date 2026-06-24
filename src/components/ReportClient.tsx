"use client";

import { useEffect, useState } from "react";
import { Download, Send, Loader2 } from "lucide-react";
import Markdown from "@/components/Markdown";

export default function ReportClient() {
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/report")
      .then((r) => r.json())
      .then((d) => setReport(d.report || ""))
      .finally(() => setLoading(false));
  }, []);

  async function push() {
    setPushing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/report", { method: "POST" });
      const d = await res.json();
      setMsg(d.ok ? "✓ 已推送到 webhook" : `✗ ${d.error || "推送失败"}`);
    } finally {
      setPushing(false);
    }
  }

  if (loading) return <p className="text-sm text-rock-500">生成中…</p>;

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <a href="/api/report?download=1" className="btn-ghost px-3 py-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> 下载 .md
        </a>
        <button onClick={push} disabled={pushing} className="btn-ghost px-3 py-1.5 text-xs">
          {pushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          推送到 webhook
        </button>
        {msg && <span className="text-xs text-rock-400">{msg}</span>}
      </div>
      <div className="card p-6">
        <Markdown content={report} />
      </div>
    </>
  );
}
