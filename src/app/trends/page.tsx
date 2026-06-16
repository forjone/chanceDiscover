import { PageHeader } from "@/components/ui";
import TrendsClient from "@/components/TrendsClient";
import EvolutionClient from "@/components/EvolutionClient";

export const dynamic = "force-dynamic";

export default function TrendsPage() {
  return (
    <>
      <PageHeader
        title="趋势监控"
        subtitle="用真实热度轨迹校准「时机」维度——拒绝 AI 凭空臆测。"
      />
      <TrendsClient />

      <h2 className="mb-3 mt-10 text-sm font-semibold text-rock-200">痛点演化（跨运行）</h2>
      <EvolutionClient />
    </>
  );
}
