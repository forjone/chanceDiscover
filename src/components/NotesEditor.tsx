"use client";

import { useState } from "react";
import { Loader2, Check, NotebookPen } from "lucide-react";

export default function NotesEditor({ id, initial }: { id: number; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const dirty = notes !== saved;

  async function save() {
    setSaving(true);
    setDone(false);
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaved(notes);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-rock-300">
          <NotebookPen className="h-3.5 w-3.5 text-rock-400" /> 我的笔记
        </span>
        {done && <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3 w-3" /> 已保存</span>}
      </div>
      <textarea
        className="input min-h-[110px] text-sm"
        placeholder="记录你的判断、调研结论、下一步…（重新挖掘后保留）"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <button onClick={save} disabled={!dirty || saving} className="btn-primary px-3 py-1.5 text-xs">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          保存笔记
        </button>
      </div>
    </div>
  );
}
