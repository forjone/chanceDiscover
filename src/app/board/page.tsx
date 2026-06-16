import { PageHeader } from "@/components/ui";
import BoardClient from "@/components/BoardClient";
import ActivityLog from "@/components/ActivityLog";
import MemberBadge from "@/components/MemberBadge";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  return (
    <>
      <PageHeader
        title="机会看板"
        subtitle="拖拽机会在状态间流转；团队动态实时记录。"
        action={<MemberBadge />}
      />
      <BoardClient />
      <div className="mt-8">
        <ActivityLog />
      </div>
    </>
  );
}
