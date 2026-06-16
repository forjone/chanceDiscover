"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pickaxe, Loader2 } from "lucide-react";

export default function RunPipelineButton({ label = "开始挖掘" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pipeline", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "挖掘失败");
      setMsg(`✓ 生成 ${data.opportunities} 个机会 / ${data.clusters} 个痛点簇`);
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
      <button onClick={run} disabled={loading} className="btn-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pickaxe className="h-4 w-4" />}
        {loading ? "挖掘中…" : label}
      </button>
    </div>
  );
}
