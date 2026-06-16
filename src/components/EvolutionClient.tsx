"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Series {
  signature: string;
  label: string;
  points: { runId: number; date: string; reviewCount: number; score: number }[];
  delta: number;
  latestScore: number;
}

export default function EvolutionClient() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/evolution")
      .then((r) => r.json())
      .then((d) => setSeries(d.series || []))
      .finally(() => setLoaded(true));
  }, []);

  // Only meaningful once there are >=2 runs of history somewhere.
  const withHistory = series.filter((s) => s.points.length >= 2);
  if (!loaded) return null;
  if (withHistory.length === 0) {
    return (
      <p className="mt-2 text-xs text-rock-500">
        多跑几次「挖掘」后，这里会出现每个痛点随时间的评论量演化（用于判断痛点是在升温还是降温）。
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {withHistory.map((s) => {
        const up = s.delta > 0;
        const down = s.delta < 0;
        const color = up ? "#34d399" : down ? "#f87171" : "#64748b";
        const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
        return (
          <div key={s.signature} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium text-rock-100" title={s.label}>{s.label}</span>
              <span className="inline-flex items-center gap-1 text-xs" style={{ color }}>
                <Icon className="h-3.5 w-3.5" />{s.delta > 0 ? `+${s.delta}` : s.delta}
              </span>
            </div>
            <div className="mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                  <YAxis hide domain={[0, "dataMax + 1"]} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={() => ""}
                    formatter={(v: number) => [`${v} 条`, "评论量"]}
                  />
                  <Line type="monotone" dataKey="reviewCount" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 text-[11px] text-rock-500">
              {s.points.length} 次运行 · 当前分 {Math.round(s.latestScore)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
