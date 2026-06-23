"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, X, Plus, Sparkles } from "lucide-react";

export default function TagEditor({
  id,
  initial,
  suggestions = [],
}: {
  id: number;
  initial: string[];
  suggestions?: string[];
}) {
  const [tags, setTags] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const router = useRouter();
  const openSuggestions = suggestions.filter((s) => !tags.includes(s));

  async function save(next: string[]) {
    setTags(next);
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
    router.refresh();
  }

  function add() {
    const t = input.trim();
    if (!t || tags.includes(t) || tags.length >= 12) {
      setInput("");
      return;
    }
    save([...tags, t]);
    setInput("");
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-rock-300">
        <Tag className="h-3.5 w-3.5 text-rock-400" /> 标签
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-rock-800 px-2.5 py-0.5 text-xs text-rock-200">
            {t}
            <button onClick={() => save(tags.filter((x) => x !== t))} className="text-rock-500 hover:text-red-400">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="加标签"
            className="w-20 rounded-lg border border-rock-700 bg-rock-950/60 px-2 py-0.5 text-xs text-rock-100 outline-none focus:border-ore-500/60"
          />
          <button onClick={add} className="text-rock-500 hover:text-ore-300">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {openSuggestions.length > 0 && (
        <div className="mt-2.5 border-t border-rock-800 pt-2.5">
          <div className="mb-1.5 flex items-center gap-1 text-[11px] text-rock-500">
            <Sparkles className="h-3 w-3 text-ore-400" /> 建议标签（点击添加）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {openSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => save([...tags, s])}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-rock-600 px-2.5 py-0.5 text-xs text-rock-400 hover:border-ore-500/40 hover:text-ore-300"
              >
                <Plus className="h-3 w-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
