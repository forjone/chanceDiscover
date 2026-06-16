import React from "react";

// Minimal, dependency-free Markdown renderer for generated artifacts.
// Supports headings, bold, unordered lists, task checkboxes, blockquotes, hr.
function inline(text: string, key: number): React.ReactNode {
  // Split on **bold** and `code`.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <React.Fragment key={key}>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="text-rock-100">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return <code key={i} className="rounded bg-rock-800 px-1 text-ore-300">{p.slice(1, -1)}</code>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];

  const flush = () => {
    if (list.length) {
      out.push(<ul key={`ul-${out.length}`} className="my-2 space-y-1 pl-1">{list}</ul>);
      list = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { flush(); return; }

    const task = line.match(/^\s*-\s*\[( |x|X)\]\s+(.*)$/);
    if (task) {
      list.push(
        <li key={idx} className="flex items-start gap-2 text-sm text-rock-300">
          <span className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${task[1].toLowerCase() === "x" ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-rock-600"}`}>
            {task[1].toLowerCase() === "x" ? "✓" : ""}
          </span>
          <span>{inline(task[2], idx)}</span>
        </li>
      );
      return;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      list.push(
        <li key={idx} className="flex gap-2 text-sm text-rock-300">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ore-500" />
          <span>{inline(li[1], idx)}</span>
        </li>
      );
      return;
    }
    flush();
    if (line.startsWith("### ")) out.push(<h4 key={idx} className="mt-3 text-sm font-semibold text-rock-100">{inline(line.slice(4), idx)}</h4>);
    else if (line.startsWith("## ")) out.push(<h3 key={idx} className="mt-4 text-base font-semibold text-ore-200">{inline(line.slice(3), idx)}</h3>);
    else if (line.startsWith("# ")) out.push(<h2 key={idx} className="mt-2 text-lg font-bold text-rock-50">{inline(line.slice(2), idx)}</h2>);
    else if (line.startsWith("> ")) out.push(<blockquote key={idx} className="my-2 border-l-2 border-rock-700 pl-3 text-xs text-rock-500">{inline(line.slice(2), idx)}</blockquote>);
    else if (/^(---|\*\*\*)$/.test(line.trim())) out.push(<hr key={idx} className="my-3 border-rock-800" />);
    else out.push(<p key={idx} className="my-1.5 text-sm leading-relaxed text-rock-300">{inline(line, idx)}</p>);
  });
  flush();

  return <div className="prose-miner">{out}</div>;
}
