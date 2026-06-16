import { PageHeader } from "@/components/ui";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="设置" subtitle="环境配置、评分权重、定时监控与数据管理。" />
      <SettingsClient />
    </>
  );
}
