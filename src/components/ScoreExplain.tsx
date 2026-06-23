import { ChevronDown } from "lucide-react";
import type { ScoreBreakdown, ScoreExplain as Explain } from "@/lib/types";
import { SCORE_LABELS, SCORE_WEIGHTS } from "@/lib/types";

const DIM_TONE: Record<keyof Explain, string> = {
  demand: "text-sky-300",
  payment: "text-ore-300",
  gap: "text-emerald-300",
  timing: "text-fuchsia-300",
};

// "Why is it this score" — per-dimension reasons grounded in the real factors.
export default function ScoreExplain({
  score,
  explain,
}: {
  score: ScoreBreakdown;
  explain: Explain;
}) {
  const dims: (keyof typeof SCORE_WEIGHTS)[] = ["demand", "payment", "gap", "timing"];
  return (
    <div className="card p-4">
      <div className="mb-2 text-xs font-medium text-rock-300">为什么是这个分</div>
      <div className="space-y-1">
        {dims.map((dim) => {
          const reasons = explain[dim] || [];
          return (
            <details key={dim} className="group rounded-lg border border-rock-800 bg-rock-950/40 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-rock-300">
                <span>
                  <span className={DIM_TONE[dim]}>●</span> {SCORE_LABELS[dim]}
                  <span className="ml-1 text-rock-600">{Math.round(SCORE_WEIGHTS[dim] * 100)}%</span>
                </span>
                <span className="flex items-center gap-1.5 text-rock-400">
                  <span className="tabular-nums">{score[dim].toFixed(1)}/25</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <ul className="mt-2 space-y-1 pl-1">
                {reasons.length === 0 ? (
                  <li className="text-[11px] text-rock-500">无说明</li>
                ) : (
                  reasons.map((r, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-rock-400">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rock-600" />
                      {r}
                    </li>
                  ))
                )}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
