import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import SearchClient from "@/components/SearchClient";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <>
      <PageHeader title="搜索" subtitle="在机会卡片与评论中检索关键词。" />
      <Suspense fallback={<p className="text-sm text-rock-500">加载中…</p>}>
        <SearchClient />
      </Suspense>
    </>
  );
}
