"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

// Phase 2 monitoring: re-collect every store source, then re-mine.
export default function RefreshAllButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/collect/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "刷新失败");
      setMsg(
        data.apps === 0
          ? "没有可刷新的商店矿源"
          : `✓ ${data.apps} 个矿源 · 新增 ${data.inserted} 条 · ${data.opportunities} 个机会`
      );
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-rock-400">{msg}</span>}
      <button onClick={run} disabled={loading} className="btn-ghost">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {loading ? "刷新中…" : "刷新所有矿源"}
      </button>
    </div>
  );
}
