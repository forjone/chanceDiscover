// Lightweight, dependency-free text heuristics. Deterministic and offline so the
// MVP pipeline runs without any LLM/API key. Bilingual (EN + 中文) lexicons.

const NEGATIVE_WORDS = [
  // English
  "crash", "crashes", "crashing", "bug", "buggy", "broken", "broke", "slow",
  "laggy", "lag", "freeze", "frozen", "stuck", "error", "fail", "fails",
  "failed", "useless", "terrible", "awful", "horrible", "worst", "hate",
  "annoying", "annoyed", "frustrating", "frustrated", "disappointed",
  "disappointing", "expensive", "overpriced", "scam", "ripoff", "missing",
  "lacks", "lacking", "cant", "cannot", "wont", "doesnt", "unable", "impossible",
  "confusing", "complicated", "clunky", "ugly", "unreliable", "garbage",
  "waste", "refund", "unusable", "glitch", "glitchy", "limited", "limit",
  // 中文
  "崩溃", "闪退", "卡顿", "卡", "慢", "卡死", "死机", "bug", "故障", "失败",
  "无法", "不能", "没法", "缺少", "缺失", "没有", "失望", "垃圾", "差", "烂",
  "贵", "太贵", "坑", "骗", "退款", "难用", "复杂", "麻烦", "卡顿", "广告",
  "收费", "限制", "丢失", "卡顿",
];

const POSITIVE_WORDS = [
  "love", "great", "awesome", "amazing", "excellent", "perfect", "best",
  "good", "nice", "helpful", "easy", "smooth", "fast", "reliable", "fantastic",
  "wonderful", "brilliant", "favorite", "recommend",
  "喜欢", "好用", "强大", "完美", "棒", "赞", "流畅", "方便", "推荐", "优秀",
];

// Signals of willingness to pay. Strong signals weight more in scoring.
const PAY_INTENT_PATTERNS: { re: RegExp; strong: boolean }[] = [
  { re: /\b(i('| wi)?ll|i would|i'?d) (gladly |happily )?pay\b/i, strong: true },
  { re: /\btake my money\b/i, strong: true },
  { re: /\bworth (paying|the money|every penny)\b/i, strong: true },
  { re: /\b(willing|happy) to pay\b/i, strong: true },
  { re: /\bshut up and take\b/i, strong: true },
  { re: /\b(subscri\w+|premium|pro version|paid version|upgrade|in[- ]?app purchase)\b/i, strong: false },
  { re: /\b(price|pricing|cost|charge|fee|expensive|overpriced|cheaper)\b/i, strong: false },
  { re: /(愿意|肯|会)?(付费|花钱|买单|订阅|充值|会员|续费)/, strong: true },
  { re: /(收费|价格|太贵|定价|涨价)/, strong: false },
];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "i", "you", "we", "they", "he", "she", "my", "your", "our", "their",
  "me", "him", "her", "them", "app", "apps", "would", "could", "should", "can",
  "will", "just", "really", "very", "so", "too", "also", "have", "has", "had",
  "do", "does", "did", "not", "no", "yes", "get", "got", "use", "using", "used",
  "all", "any", "some", "more", "most", "much", "if", "then", "than", "when",
  "what", "which", "who", "how", "why", "out", "up", "down", "about", "as", "at",
  "by", "from", "into", "like", "now", "one", "only", "even", "still", "make",
  "want", "need", "please", "thanks", "thank", "good", "great", "love", "nice",
]);

export function tokenize(text: string): string[] {
  // Split on non-letter/number; keep CJK by treating each CJK char run.
  const lower = text.toLowerCase();
  const latin = (lower.match(/[a-z0-9']{2,}/g) || []).map((t) => t.replace(/'/g, ""));
  // Crude CJK bigrams to surface Chinese pain phrases.
  const cjkRuns = lower.match(/[一-鿿]{2,}/g) || [];
  const cjkBigrams: string[] = [];
  for (const run of cjkRuns) {
    if (run.length === 2) cjkBigrams.push(run);
    else for (let i = 0; i < run.length - 1; i++) cjkBigrams.push(run.slice(i, i + 2));
  }
  return [...latin, ...cjkBigrams].filter((t) => t && !STOP_WORDS.has(t));
}

export function sentiment(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let score = 0;
  const joined = text.toLowerCase();
  for (const w of NEGATIVE_WORDS) if (joined.includes(w)) score -= 1;
  for (const w of POSITIVE_WORDS) if (joined.includes(w)) score += 1;
  // Normalize to -1..1 with diminishing returns.
  return Math.max(-1, Math.min(1, score / 4));
}

export function detectPayIntent(text: string): { intent: boolean; strength: number } {
  let strength = 0;
  for (const { re, strong } of PAY_INTENT_PATTERNS) {
    if (re.test(text)) strength += strong ? 1 : 0.4;
  }
  return { intent: strength > 0, strength: Math.min(1, strength) };
}

// Extracts ranked keyword candidates from a corpus (TF-IDF-lite).
export function extractKeywords(
  docs: string[],
  topN = 8
): { term: string; weight: number }[] {
  const df = new Map<string, number>();
  const tf = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set<string>();
    for (const tok of tokenize(doc)) {
      tf.set(tok, (tf.get(tok) || 0) + 1);
      if (!seen.has(tok)) {
        df.set(tok, (df.get(tok) || 0) + 1);
        seen.add(tok);
      }
    }
  }
  const N = Math.max(1, docs.length);
  const scored: { term: string; weight: number }[] = [];
  for (const [term, freq] of tf) {
    const docFreq = df.get(term) || 1;
    if (freq < 2 && N > 4) continue; // ignore one-offs in larger corpora
    const idf = Math.log(1 + N / docFreq);
    scored.push({ term, weight: freq * idf });
  }
  scored.sort((a, b) => b.weight - a.weight);
  return scored.slice(0, topN);
}
