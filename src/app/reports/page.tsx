import { PageHeader } from "@/components/ui";
import ReportClient from "@/components/ReportClient";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="周报" subtitle="当前矿区状态的自动摘要，可下载或推送到 webhook。" />
      <ReportClient />
    </>
  );
}
