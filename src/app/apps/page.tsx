import Link from "next/link";
import { AppWindow } from "lucide-react";
import { listApps } from "@/db/repo";
import { PageHeader, EmptyState } from "@/components/ui";
import RefreshAllButton from "@/components/RefreshAllButton";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  appstore: "App Store",
  googleplay: "Google Play",
};

export default async function AppsPage() {
  const apps = (await listApps()) as (Awaited<ReturnType<typeof listApps>>[number] & { reviewCount?: number })[];

  return (
    <>
      <PageHeader
        title="应用矿源"
        subtitle="正在追踪的应用，以及各自贡献的评论样本量。"
        action={apps.length > 0 ? <RefreshAllButton /> : undefined}
      />

      {apps.length === 0 ? (
        <EmptyState
          title="还没有矿源"
          hint="去「评论数据」搜索并采集一个应用，或手动录入评论。"
          action={
            <Link href="/reviews" className="btn-primary mt-2">
              添加矿源
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/apps/${app.id}`}
              className="card flex items-center gap-3 p-4 transition-colors hover:border-ore-500/30"
            >
              {app.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.iconUrl} alt="" className="h-12 w-12 rounded-xl" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rock-800">
                  <AppWindow className="h-5 w-5 text-rock-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-rock-100">{app.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-rock-500">
                  <span className="chip">{PLATFORM_LABEL[app.platform] || app.platform}</span>
                  {app.category && <span className="truncate">{app.category}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-semibold text-ore-300">{app.reviewCount ?? 0}</div>
                <div className="text-[10px] text-rock-500">评论</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
