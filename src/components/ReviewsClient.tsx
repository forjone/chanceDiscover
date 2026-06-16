"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Download, ClipboardPaste, Sparkles } from "lucide-react";
import { Stars } from "@/components/ui";
import type { Review } from "@/lib/types";

type Tab = "manual" | "collect";

interface StoreResult {
  storeId: string;
  name: string;
  category: string | null;
  iconUrl: string | null;
}

const SAMPLE = `5 | 很好用但缺一个功能 | 整体不错，可惜不能离线使用，没网就打不开，太不方便了，愿意付费买离线版
2 | 总是闪退 | 每次打开几分钟就崩溃闪退，根本没法用，已经好几个版本了还不修
1 | 广告太多 | 免费版广告多到没法忍，想去广告还要订阅，太贵了
4 | 导出很麻烦 | 数据导出步骤太复杂，导出格式也少，希望能一键导出 PDF
3 | 同步不靠谱 | 多设备同步经常丢数据，换手机后笔记全没了，太可怕`;

export default function ReviewsClient() {
  const [tab, setTab] = useState<Tab>("manual");
  const router = useRouter();

  // manual
  const [appName, setAppName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // collect
  const [platform, setPlatform] = useState<"appstore" | "googleplay">("appstore");
  const [term, setTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<StoreResult[]>([]);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);

  // recent reviews
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = useCallback(async () => {
    const res = await fetch("/api/reviews");
    const data = await res.json();
    setReviews(data.reviews || []);
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function submitManual() {
    if (!text.trim()) {
      setMsg("请先粘贴评论内容");
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName: appName || "手动录入", text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setMsg(`✓ 新增 ${data.inserted} 条评论（共解析 ${data.total} 条）`);
      setText("");
      await loadReviews();
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function search() {
    if (!term.trim()) return;
    setSearching(true);
    setResults([]);
    setSearchNote(null);
    try {
      const res = await fetch(`/api/search?term=${encodeURIComponent(term)}&platform=${platform}`);
      const data = await res.json();
      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        setSearchNote(
          platform === "googleplay"
            ? "Google Play 搜索依赖可选依赖，若无结果可改用 App Store。"
            : "未找到匹配应用，换个关键词试试。"
        );
      }
    } catch {
      setSearchNote("搜索失败，请稍后重试。");
    } finally {
      setSearching(false);
    }
  }

  async function collect(app: StoreResult) {
    setCollectingId(app.storeId);
    setMsg(null);
    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          storeId: app.storeId,
          appName: app.name,
          category: app.category,
          iconUrl: app.iconUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "采集失败");
      setMsg(
        data.inserted > 0
          ? `✓ 从「${app.name}」采集 ${data.total} 条，新增 ${data.inserted} 条`
          : `⚠ 「${app.name}」未获取到新评论。${data.note || ""}`
      );
      await loadReviews();
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setCollectingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input panel */}
      <div className="card p-5">
        <div className="mb-4 inline-flex rounded-xl border border-rock-700 p-1">
          <button
            onClick={() => setTab("manual")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              tab === "manual" ? "bg-ore-500 text-rock-950" : "text-rock-400 hover:text-rock-200"
            }`}
          >
            <ClipboardPaste className="h-4 w-4" /> 手动录入
          </button>
          <button
            onClick={() => setTab("collect")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              tab === "collect" ? "bg-ore-500 text-rock-950" : "text-rock-400 hover:text-rock-200"
            }`}
          >
            <Download className="h-4 w-4" /> 商店采集
          </button>
        </div>

        {tab === "manual" ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="应用名称（可选）"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
            <textarea
              className="input min-h-[220px] font-mono text-xs leading-relaxed"
              placeholder={"每行一条，可选格式：评分 | 标题 | 正文\n例如：\n2 | 总是闪退 | 打开就崩溃，没法用"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => setText(SAMPLE)}
                className="inline-flex items-center gap-1 text-xs text-rock-400 hover:text-ore-300"
              >
                <Sparkles className="h-3 w-3" /> 填入示例数据
              </button>
              <button onClick={submitManual} disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                录入评论
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                className="input w-32"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as "appstore" | "googleplay")}
              >
                <option value="appstore">App Store</option>
                <option value="googleplay">Google Play</option>
              </select>
              <input
                className="input flex-1"
                placeholder="搜索应用名，如 Notion、剪映"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <button onClick={search} disabled={searching} className="btn-ghost">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {searchNote && <p className="text-xs text-rock-500">{searchNote}</p>}
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {results.map((app) => (
                <div
                  key={app.storeId}
                  className="flex items-center gap-3 rounded-xl border border-rock-800 p-2.5"
                >
                  {app.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.iconUrl} alt="" className="h-9 w-9 rounded-lg" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-rock-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-rock-100">{app.name}</div>
                    <div className="truncate text-[11px] text-rock-500">{app.category || app.storeId}</div>
                  </div>
                  <button
                    onClick={() => collect(app)}
                    disabled={collectingId === app.storeId}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    {collectingId === app.storeId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    采集
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {msg && <div className="mt-3 rounded-lg bg-rock-800/60 px-3 py-2 text-xs text-rock-300">{msg}</div>}
      </div>

      {/* Recent reviews */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-rock-200">最近评论</h3>
          <span className="text-xs text-rock-500">{reviews.length} 条</span>
        </div>
        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-rock-500">还没有评论数据。</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-rock-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-rock-300">{r.appName}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.payIntent === 1 && <span className="chip border-ore-500/30 text-ore-300">付费意愿</span>}
                    <Stars rating={r.rating} />
                  </div>
                </div>
                {r.title && <div className="mt-1 text-sm text-rock-200">{r.title}</div>}
                <p className="mt-0.5 line-clamp-2 text-xs text-rock-400">{r.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
