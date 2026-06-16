"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { Trend } from "@/lib/types";

export default function TrendsClient() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [source, setSource] = useState<string>("reviews");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then((d) => {
        setTrends(d.trends || []);
        setSource(d.source || "reviews");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-rock-500">加载中…</p>;

  if (trends.length === 0) {
    return (
      <EmptyState
        title="还没有趋势数据"
        hint="运行一次挖掘后，系统会为每个痛点关键词记录真实热度轨迹（YouTube 或评论量）。"
      />
    );
  }

  return (
    <>
      <div className="mb-4 chip">
        信号来源：{source === "youtube" ? "YouTube Data API（真实发布热度）" : "评论量轨迹（真实数据兜底）"}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trends.map((t) => {
          const up = t.momentum > 0.1;
          const down = t.momentum < -0.1;
          const color = up ? "#34d399" : down ? "#f87171" : "#64748b";
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          return (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="truncate font-medium text-rock-100" title={t.keyword}>
                  {t.keyword}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {(t.momentum * 100).toFixed(0)}
                </span>
              </div>
              <div className="mt-3 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={t.dataPoints} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`g-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={[0, "dataMax + 1"]} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#g-${t.id})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 text-[11px] text-rock-500">
                {t.dataPoints.length} 个数据点 · {t.source === "youtube" ? "YouTube" : "评论"}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
