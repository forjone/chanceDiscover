import type { RawReview } from "./collectors/appstore";

// RFC4180-ish CSV/TSV parser + review column auto-mapping. Dependency-free so
// batch import works offline. For Excel, export to CSV first.

// Parse a delimited string into rows of fields, honoring quoted fields that may
// contain the delimiter, quotes ("" escaping), and newlines.
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

const COLUMN_ALIASES: Record<keyof ColumnMap, string[]> = {
  rating: ["rating", "score", "stars", "star", "评分", "星级", "星", "打分"],
  title: ["title", "subject", "headline", "标题", "主题"],
  content: ["content", "body", "review", "text", "comment", "正文", "评论", "内容", "评价"],
  author: ["author", "user", "username", "name", "nickname", "用户", "作者", "昵称"],
  date: ["date", "time", "created", "updated", "日期", "时间"],
  version: ["version", "ver", "版本"],
};

interface ColumnMap {
  rating: number;
  title: number;
  content: number;
  author: number;
  date: number;
  version: number;
}

function mapColumns(header: string[]): ColumnMap | null {
  const norm = header.map((h) => h.trim().toLowerCase());
  const find = (aliases: string[]) =>
    norm.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
  const map: ColumnMap = {
    rating: find(COLUMN_ALIASES.rating),
    title: find(COLUMN_ALIASES.title),
    content: find(COLUMN_ALIASES.content),
    author: find(COLUMN_ALIASES.author),
    date: find(COLUMN_ALIASES.date),
    version: find(COLUMN_ALIASES.version),
  };
  // A header is only valid if it locates the content column.
  return map.content >= 0 ? map : null;
}

function hashId(parts: string[]): string {
  let h = 0;
  const s = parts.join("");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `csv-${(h >>> 0).toString(36)}`;
}

function toRating(v: string): number {
  const n = parseFloat(v);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

// Parse a CSV/TSV string into reviews. Auto-detects delimiter and columns.
// Falls back to positional columns (rating, title, content) when there's no
// recognizable header, or single-column = content.
export function parseCsvReviews(text: string): RawReview[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const delimiter = detectDelimiter(trimmed.split("\n")[0]);
  const rows = parseDelimited(trimmed, delimiter);
  if (rows.length === 0) return [];

  const map = mapColumns(rows[0]);
  const out: RawReview[] = [];

  if (map) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const content = (r[map.content] || "").trim();
      if (!content) continue;
      const title = map.title >= 0 ? (r[map.title] || "").trim() || null : null;
      const rating = map.rating >= 0 ? toRating(r[map.rating] || "") : 0;
      const author = map.author >= 0 ? (r[map.author] || "").trim() || null : null;
      const version = map.version >= 0 ? (r[map.version] || "").trim() || null : null;
      const dateRaw = map.date >= 0 ? (r[map.date] || "").trim() : "";
      const date = dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toISOString() : new Date().toISOString();
      out.push({ externalId: hashId([String(rating), title || "", content]), author, title, content, rating, version, date });
    }
    return out;
  }

  // No header: positional. 3+ cols -> rating,title,content; else last col = content.
  for (const r of rows) {
    let rating = 0, title: string | null = null, content = "";
    if (r.length >= 3 && /^[0-5](\.\d+)?$/.test((r[0] || "").trim())) {
      rating = toRating(r[0]); title = (r[1] || "").trim() || null; content = r.slice(2).join(" ").trim();
    } else {
      content = r.join(" ").trim();
    }
    if (!content) continue;
    out.push({ externalId: hashId([String(rating), title || "", content]), author: null, title, content, rating, version: null, date: new Date().toISOString() });
  }
  return out;
}

// Keep only reviews strictly newer than a watermark date (incremental ingest).
// Reviews without a parseable date are kept (can't prove they're old).
export function filterNewerThan(reviews: RawReview[], watermark: string | null): RawReview[] {
  if (!watermark) return reviews;
  const wm = Date.parse(watermark);
  if (isNaN(wm)) return reviews;
  return reviews.filter((r) => {
    if (!r.date) return true;
    const t = Date.parse(r.date);
    return isNaN(t) || t > wm;
  });
}

// Newest review date in a batch, as ISO string (for advancing the watermark).
export function newestDate(reviews: RawReview[]): string | null {
  let max = -Infinity;
  for (const r of reviews) {
    if (!r.date) continue;
    const t = Date.parse(r.date);
    if (!isNaN(t) && t > max) max = t;
  }
  return max === -Infinity ? null : new Date(max).toISOString();
}
