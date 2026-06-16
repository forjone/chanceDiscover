"use client";

import { useEffect, useState } from "react";
import { UserRound, Check } from "lucide-react";

// Sets a display name (cookie) used to attribute activity-log entries.
export default function MemberBadge() {
  const [member, setMember] = useState("");
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/member")
      .then((r) => r.json())
      .then((d) => setMember(d.member || ""));
  }, []);

  async function save() {
    await fetch("/api/member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member: val }),
    });
    setMember(val);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="你的名字"
          className="w-32 rounded-lg border border-rock-700 bg-rock-950/60 px-2 py-1 text-xs text-rock-100 outline-none focus:border-ore-500/60"
        />
        <button onClick={save} className="btn-primary px-2.5 py-1 text-xs">保存</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setVal(member);
        setEditing(true);
      }}
      className="btn-ghost px-3 py-1.5 text-xs"
      title="设置协作署名"
    >
      {saved ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <UserRound className="h-3.5 w-3.5" />}
      {member || "设置署名"}
    </button>
  );
}
