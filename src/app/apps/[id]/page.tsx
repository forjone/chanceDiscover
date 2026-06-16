import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AppWindow, MessageSquareText, Star, CreditCard } from "lucide-react";
import { getApp, listReviews } from "@/db/repo";
import { PageHeader, Stat, Stars } from "@/components/ui";
import AppActions from "@/components/AppActions";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  appstore: "App Store",
  googleplay: "Google Play",
};

export default async function AppDetail({ params }: { params: { id: string } }) {
  const app = await getApp(Number(params.id));
  if (!app) notFound();
  const reviews = await listReviews({ appId: app.id, limit: 300 });

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const payIntent = reviews.filter((r) => r.payIntent === 1).length;

  return (
    <>
      <Link href="/apps" className="mb-4 inline-flex items-center gap-1 text-sm text-rock-400 hover:text-rock-200">
        <ArrowLeft className="h-4 w-4" /> 返回矿源列表
      </Link>

      <PageHeader
        title={app.name}
        subtitle={`${PLATFORM_LABEL[app.platform] || app.platform}${app.category ? ` · ${app.category}` : ""} · ${app.storeId}`}
        action={<AppActions app={app} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card stat-grad flex items-center gap-3 p-4">
          {app.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.iconUrl} alt="" className="h-12 w-12 rounded-xl" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rock-800">
              <AppWindow className="h-5 w-5 text-rock-500" />
            </div>
          )}
          <div className="text-xs text-rock-400">矿源</div>
        </div>
        <Stat label="评论样本" value={reviews.length} icon={<MessageSquareText className="h-4 w-4" />} />
        <Stat label="平均评分" value={avg.toFixed(1)} icon={<Star className="h-4 w-4" />} />
        <Stat label="付费意愿" value={payIntent} icon={<CreditCard className="h-4 w-4" />} hint="提及付费的评论" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-rock-200">评论列表</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-rock-500">该矿源还没有评论。</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-rock-500">
                  {r.author && <span>{r.author}</span>}
                  {r.version && <span className="chip">v{r.version}</span>}
                  {r.payIntent === 1 && <span className="chip border-ore-500/30 text-ore-300">付费意愿</span>}
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.title && <div className="mt-1 text-sm font-medium text-rock-200">{r.title}</div>}
              <p className="mt-0.5 text-sm leading-relaxed text-rock-400">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
