import { PageHeader } from "@/components/ui";
import TrendsClient from "@/components/TrendsClient";

export const dynamic = "force-dynamic";

export default function TrendsPage() {
  return (
    <>
      <PageHeader
        title="趋势监控"
        subtitle="用真实热度轨迹校准「时机」维度——拒绝 AI 凭空臆测。"
      />
      <TrendsClient />
    </>
  );
}
