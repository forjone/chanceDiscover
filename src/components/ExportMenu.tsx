"use client";

import { Download } from "lucide-react";

// Bulk export of all opportunities. Links hit the export API which streams a file.
export default function ExportMenu() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-rock-500">导出</span>
      {[
        { fmt: "md", label: "Markdown" },
        { fmt: "csv", label: "CSV" },
        { fmt: "json", label: "JSON" },
      ].map((o) => (
        <a key={o.fmt} href={`/api/export?format=${o.fmt}`} className="btn-ghost px-3 py-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> {o.label}
        </a>
      ))}
    </div>
  );
}
