import type { ScoreBreakdown } from "@/lib/types";
import { SCORE_LABELS, SCORE_WEIGHTS } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-rock-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-rock-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card stat-grad p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-rock-400">{label}</span>
        {icon && <span className="text-ore-400/80">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-rock-50">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-rock-500">{hint}</div>}
    </div>
  );
}

// Circular total-score gauge (0-100).
export function ScoreRing({ total, size = 64 }: { total: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, total)) / 100;
  const tone = total >= 75 ? "#fbbf24" : total >= 55 ? "#34d399" : total >= 35 ? "#38bdf8" : "#64748b";
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth="5" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={tone}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="rotate-90"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        fill="#f1f5f9"
        fontSize={size * 0.26}
        fontWeight={700}
      >
        {Math.round(total)}
      </text>
    </svg>
  );
}

const DIM_TONE: Record<keyof ScoreBreakdown, string> = {
  demand: "bg-sky-400",
  payment: "bg-ore-400",
  gap: "bg-emerald-400",
  timing: "bg-fuchsia-400",
  total: "bg-rock-400",
};

// Four weighted dimension bars (each raw 0-25).
export function ScoreBars({ score, compact = false }: { score: ScoreBreakdown; compact?: boolean }) {
  const dims: (keyof typeof SCORE_WEIGHTS)[] = ["demand", "payment", "gap", "timing"];
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {dims.map((dim) => {
        const val = score[dim];
        const pct = (val / 25) * 100;
        return (
          <div key={dim}>
            <div className="flex items-center justify-between text-[11px] text-rock-400">
              <span>
                {SCORE_LABELS[dim]}
                <span className="ml-1 text-rock-600">{Math.round(SCORE_WEIGHTS[dim] * 100)}%</span>
              </span>
              <span className="tabular-nums text-rock-300">{val.toFixed(1)}/25</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-rock-800">
              <div className={`h-full rounded-full ${DIM_TONE[dim]}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TierBadge({ total }: { total: number }) {
  const t =
    total >= 75
      ? { label: "高潜力", cls: "border-ore-500/40 bg-ore-500/10 text-ore-300" }
      : total >= 55
      ? { label: "值得关注", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" }
      : total >= 35
      ? { label: "观察中", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" }
      : { label: "信号弱", cls: "border-rock-700 bg-rock-800/60 text-rock-400" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.cls}`}>
      {t.label}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-ore-400" title={`${rating} 星`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
      <span className="text-rock-700">{"★".repeat(5 - Math.max(0, Math.min(5, Math.round(rating))))}</span>
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="text-rock-300">{title}</div>
      {hint && <div className="max-w-md text-sm text-rock-500">{hint}</div>}
      {action}
    </div>
  );
}
