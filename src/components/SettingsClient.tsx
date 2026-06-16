"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database, Youtube, Sparkles, Globe, ShieldCheck, Loader2, Play, Trash2, AlertTriangle,
} from "lucide-react";
import { SCORE_LABELS, SCORE_WEIGHTS } from "@/lib/types";

interface Config {
  database: string;
  youtubeKey: boolean;
  anthropicKey: boolean;
  cronSecret: boolean;
  appstoreCountry: string;
}
interface Monitoring {
  enabled: boolean;
  lastRunAt: string | null;
  lastResult: string | null;
}

function Dot({ on }: { on: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-rock-600"}`} />
  );
}

export default function SettingsClient() {
  const [config, setConfig] = useState<Config | null>(null);
  const [monitoring, setMonitoring] = useState<Monitoring | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const [cronUrl, setCronUrl] = useState("");

  useEffect(() => {
    setCronUrl(`${window.location.origin}/api/cron`);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config);
        setMonitoring(d.monitoring);
      });
  }, []);

  async function toggleMonitoring(enabled: boolean) {
    setBusy("toggle");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const d = await res.json();
    setMonitoring(d.monitoring);
    setBusy(null);
  }

  async function runNow() {
    setBusy("run");
    setMsg(null);
    try {
      const res = await fetch("/api/cron?force=1", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "运行失败");
      setMsg(`✓ ${d.apps ?? 0} 矿源 · 新增 ${d.inserted ?? 0} 评论 · ${d.opportunities ?? 0} 机会`);
      const s = await fetch("/api/settings").then((r) => r.json());
      setMonitoring(s.monitoring);
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function clearData(scope: "artifacts" | "all") {
    const label = scope === "all" ? "全部数据（应用、评论、机会、记录）" : "聚类与机会卡片";
    if (!confirm(`确定清空${label}？此操作不可撤销。`)) return;
    setBusy(scope);
    try {
      await fetch(`/api/admin/clear?scope=${scope}`, { method: "POST" });
      setMsg(`✓ 已清空${label}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!config || !monitoring) return <p className="text-sm text-rock-500">加载中…</p>;

  const items = [
    { icon: <Database className="h-4 w-4" />, label: "数据库", value: config.database, on: true },
    { icon: <Globe className="h-4 w-4" />, label: "App Store 地区", value: config.appstoreCountry.toUpperCase(), on: true },
    { icon: <Youtube className="h-4 w-4" />, label: "YouTube 趋势 Key", value: config.youtubeKey ? "已配置" : "未配置（用评论量兜底）", on: config.youtubeKey },
    { icon: <Sparkles className="h-4 w-4" />, label: "Claude 文案增强", value: config.anthropicKey ? "已配置" : "未配置（用启发式文案）", on: config.anthropicKey },
    { icon: <ShieldCheck className="h-4 w-4" />, label: "Cron 密钥", value: config.cronSecret ? "已配置" : "未配置（接口开放）", on: config.cronSecret },
  ];

  return (
    <div className="space-y-8">
      {msg && <div className="rounded-lg bg-rock-800/60 px-3 py-2 text-xs text-rock-300">{msg}</div>}

      {/* Config status */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-rock-200">环境配置</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.label} className="card flex items-center gap-3 p-4">
              <span className="text-rock-400">{it.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-rock-400">{it.label}</div>
                <div className="truncate text-sm text-rock-100">{it.value}</div>
              </div>
              <Dot on={it.on} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-rock-500">
          密钥通过环境变量配置（见 <code className="text-rock-400">.env.example</code>），不在界面中存储。
        </p>
      </section>

      {/* Scoring weights */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-rock-200">评分权重</h2>
        <div className="card p-4">
          <div className="space-y-3">
            {(["demand", "payment", "gap", "timing"] as const).map((d) => (
              <div key={d} className="flex items-center gap-3">
                <span className="w-20 text-xs text-rock-400">{SCORE_LABELS[d]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-rock-800">
                  <div className="h-full rounded-full bg-ore-500" style={{ width: `${SCORE_WEIGHTS[d] * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-rock-300">{Math.round(SCORE_WEIGHTS[d] * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-rock-500">权重总和 100%。评分基于真实评论与趋势数据计算，时机维度拒绝 AI 臆测。</p>
        </div>
      </section>

      {/* Monitoring */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-rock-200">定时监控 (Phase 2)</h2>
        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-rock-100">自动刷新矿源并重新挖掘</div>
              <div className="mt-0.5 text-xs text-rock-500">
                开启后，外部调度器命中 Cron 接口时会自动执行；关闭则跳过。
              </div>
            </div>
            <button
              onClick={() => toggleMonitoring(!monitoring.enabled)}
              disabled={busy === "toggle"}
              className={`relative h-6 w-11 rounded-full transition-colors ${monitoring.enabled ? "bg-ore-500" : "bg-rock-700"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${monitoring.enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          <div className="rounded-xl border border-rock-800 bg-rock-950/40 p-3">
            <div className="text-[11px] text-rock-400">Cron 接口（让外部调度器每天/每小时命中一次）</div>
            <code className="mt-1 block break-all text-xs text-ore-300">{cronUrl}</code>
            <div className="mt-1 text-[11px] text-rock-600">
              配置了 CRON_SECRET 时需带 <code>?secret=…</code> 或 <code>Authorization: Bearer …</code>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-rock-500">
              {monitoring.lastRunAt
                ? `上次运行：${monitoring.lastRunAt.slice(0, 19).replace("T", " ")} · ${monitoring.lastResult || ""}`
                : "尚未运行"}
            </div>
            <button onClick={runNow} disabled={busy === "run"} className="btn-ghost px-3 py-1.5 text-xs">
              {busy === "run" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              立即运行
            </button>
          </div>
        </div>
      </section>

      {/* Data management */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> 数据管理
        </h2>
        <div className="card flex flex-wrap items-center gap-3 p-5">
          <button onClick={() => clearData("artifacts")} disabled={busy === "artifacts"} className="btn-ghost px-3 py-1.5 text-xs">
            {busy === "artifacts" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            清空机会与聚类
          </button>
          <button
            onClick={() => clearData("all")}
            disabled={busy === "all"}
            className="btn border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
          >
            {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            清空全部数据
          </button>
          <span className="text-[11px] text-rock-500">「清空机会」保留评论；「清空全部」连应用与评论一起删除。</span>
        </div>
      </section>
    </div>
  );
}
