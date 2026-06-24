import { PageHeader } from "@/components/ui";
import SettingsClient from "@/components/SettingsClient";
import NotifySettings from "@/components/NotifySettings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="设置" subtitle="环境配置、评分权重、通知周报、定时监控与数据管理。" />
      <SettingsClient />
      <div className="mt-8">
        <NotifySettings />
      </div>
    </>
  );
}
