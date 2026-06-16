"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import type { App } from "@/lib/types";

export default function AppActions({ app }: { app: App }) {
  const [busy, setBusy] = useState<"collect" | "delete" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const isStoreApp = !app.storeId.startsWith("manual-");

  async function recollect() {
    setBusy("collect");
    setMsg(null);
    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: app.platform,
          storeId: app.storeId,
          country: app.country,
          appName: app.name,
          category: app.category,
          iconUrl: app.iconUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "采集失败");
      setMsg(data.inserted > 0 ? `✓ 新增 ${data.inserted} 条` : `⚠ 无新增。${data.note || ""}`);
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`确定删除矿源「${app.name}」及其全部评论？此操作不可撤销。`)) return;
    setBusy("delete");
    try {
      await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
      router.push("/apps");
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="mr-1 text-xs text-rock-400">{msg}</span>}
      {isStoreApp && (
        <button onClick={recollect} disabled={busy !== null} className="btn-ghost px-3 py-1.5 text-xs">
          {busy === "collect" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          重新采集
        </button>
      )}
      <button
        onClick={remove}
        disabled={busy !== null}
        className="btn px-3 py-1.5 text-xs border border-red-500/40 text-red-300 hover:bg-red-500/10"
      >
        {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        删除
      </button>
    </div>
  );
}
