"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OpportunityStatus } from "@/lib/types";

const OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "new", label: "新发现" },
  { value: "watching", label: "观察中" },
  { value: "building", label: "在做了" },
  { value: "archived", label: "已归档" },
];

export default function StatusControl({ id, status }: { id: number; status: OpportunityStatus }) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function change(next: OpportunityStatus) {
    setValue(next);
    setSaving(true);
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-rock-700">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => change(o.value)}
          disabled={saving}
          className={`px-3 py-1.5 text-xs transition-colors ${
            value === o.value ? "bg-ore-500 text-rock-950" : "bg-rock-900 text-rock-400 hover:bg-rock-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
