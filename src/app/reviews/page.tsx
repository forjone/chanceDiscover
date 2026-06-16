import { PageHeader } from "@/components/ui";
import ReviewsClient from "@/components/ReviewsClient";
import RunPipelineButton from "@/components/RunPipelineButton";

export const dynamic = "force-dynamic";

export default function ReviewsPage() {
  return (
    <>
      <PageHeader
        title="评论数据"
        subtitle="手动粘贴，或从 App Store / Google Play 采集真实评论。"
        action={<RunPipelineButton />}
      />
      <ReviewsClient />
    </>
  );
}
