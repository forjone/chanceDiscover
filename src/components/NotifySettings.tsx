"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Send, FileText } from "lucide-react";

interface Notify {
  webhookUrl: string;
  hasWebhook: boolean;
  alertThreshold: number;
  alertEnabled: boolean;
}

export default function NotifySettings() {
  const [n, setN] = useState<Notify | null>(null);
  const [url, setUrl] = useState("");
  const [threshold, setThreshold] = useState(70);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const d = await fetch("/api/notify").then((r) => r.json());
    setN(d.notify);
    setThreshold(d.notify.alertThreshold);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(patch: Record<string, unknown>) {
    setBusy("save");
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setUrl("");
    await load();
    setBusy(null);
  }

  async function act(path: string, label: string) {
    setBusy(path);
    setMsg(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const d = await res.json();
      setMsg(d.ok ? `✓ ${label}成功${d.status ? `（HTTP ${d.status}）` : ""}` : `✗ ${d.error || "失败"}`);
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  if (!n) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
        <Bell className="h-4 w-4 text-ore-400" /> 通知与周报
      </h2>
      <div className="card space-y-4 p-5">
        {/* Webhook URL */}
        <div>
          <div className="mb-1 text-xs text-rock-400">
            Webhook 地址（支持 Slack / 飞书 / Discord / 钉钉，或任意接收 JSON 的端点）
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={n.hasWebhook ? `已配置：${n.webhookUrl}` : "https://hooks.slack.com/services/..."}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button onClick={() => save({ webhookUrl: url })} disabled={!url.trim() || busy === "save"} className="btn-primary px-3 py-1.5 text-xs">
              保存
            </button>
            {n.hasWebhook && (
              <button onClick={() => save({ clearWebhook: true })} disabled={busy === "save"} className="btn-ghost px-3 py-1.5 text-xs">
                清除
              </button>
            )}
          </div>
        </div>

        {/* Alert toggle + threshold */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => save({ alertEnabled: !n.alertEnabled })}
              disabled={busy === "save"}
              className={`relative h-6 w-11 rounded-full transition-colors ${n.alertEnabled ? "bg-ore-500" : "bg-rock-700"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${n.alertEnabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <span className="text-sm text-rock-200">新高分机会预警</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-rock-400">
            阈值 ≥
            <input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              onBlur={() => threshold !== n.alertThreshold && save({ alertThreshold: threshold })}
              className="w-16 rounded-lg border border-rock-700 bg-rock-950/60 px-2 py-1 text-rock-100 outline-none focus:border-ore-500/60"
            />
            分
          </div>
        </div>
        <p className="text-[11px] text-rock-500">
          监控运行（/api/cron）发现总分 ≥ 阈值的新机会时，自动推送到 webhook；每个机会只提醒一次。
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-rock-800 pt-3">
          <button onClick={() => act("/api/notify/test", "测试发送")} disabled={!n.hasWebhook || busy === "/api/notify/test"} className="btn-ghost px-3 py-1.5 text-xs">
            {busy === "/api/notify/test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            发送测试
          </button>
          <button onClick={() => act("/api/report", "推送周报")} disabled={!n.hasWebhook || busy === "/api/report"} className="btn-ghost px-3 py-1.5 text-xs">
            {busy === "/api/report" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            推送周报到 webhook
          </button>
          <a href="/reports" className="btn-ghost px-3 py-1.5 text-xs">查看周报</a>
          {msg && <span className="text-xs text-rock-400">{msg}</span>}
        </div>
      </div>
    </section>
  );
}
