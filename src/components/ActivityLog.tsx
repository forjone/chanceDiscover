"use client";

import { useEffect, useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import type { Activity } from "@/lib/types";

function ago(iso: string): string {
  const t = Date.parse(iso.includes("Z") ? iso : iso.replace(" ", "T") + "Z");
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  return `${Math.floor(s / 86400)} 天前`;
}

export default function ActivityLog({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setItems(d.activity || []));
  }, [refreshKey]);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
        <ActivityIcon className="h-4 w-4 text-rock-400" /> 协作动态
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-rock-500">还没有动态。改状态、加标签、写笔记都会记录在这里。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="text-xs leading-relaxed text-rock-400">
              <span className="text-rock-200">{a.member}</span> 把{" "}
              <span className="text-rock-300">「{a.oppTitle}」</span> 的 {a.action}{" "}
              <span className="text-ore-300">{a.detail}</span>
              <span className="ml-1 text-rock-600">· {ago(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
