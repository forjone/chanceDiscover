import { listRuns } from "@/db/repo";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  pipeline: "挖掘",
  collect: "采集",
  manual: "录入",
};

const STATUS_STYLE: Record<string, string> = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  running: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  failed: "border-red-500/40 bg-red-500/10 text-red-300",
};

export default async function RunsPage() {
  const runs = await listRuns(50);

  return (
    <>
      <PageHeader title="挖掘记录" subtitle="每一次采集与挖掘的执行历史，支撑纵向积累与对比。" />

      {runs.length === 0 ? (
        <EmptyState title="还没有执行记录" hint="采集评论或运行挖掘后，这里会留下完整轨迹。" />
      ) : (
        <div className="card divide-y divide-rock-800">
          {runs.map((run) => (
            <div key={run.id} className="flex items-start gap-4 p-4">
              <div className="w-10 shrink-0 text-center">
                <div className="text-xs text-rock-600">#{run.id}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="chip">{TYPE_LABEL[run.type] || run.type}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                      STATUS_STYLE[run.status] || "border-rock-700 text-rock-400"
                    }`}
                  >
                    {run.status}
                  </span>
                  <span className="text-[11px] text-rock-500">{run.startedAt}</span>
                </div>
                {run.log && (
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-rock-400">
                    {run.log}
                  </pre>
                )}
              </div>
              <div className="hidden shrink-0 gap-3 text-right text-xs text-rock-500 sm:flex">
                {Object.entries(run.stats).map(([k, v]) => (
                  <div key={k}>
                    <div className="font-semibold text-rock-200">{String(v)}</div>
                    <div className="text-[10px]">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
