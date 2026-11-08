/**
 * 文本锚点定位（不使用 DOM Path）。
 *
 * 划线保存：anchorBefore / text / anchorAfter 三段纯文本。
 * 恢复时：在正文纯文本中查找全部相同片段，用前后文打分选出唯一位置；
 * 无法确定时返回 null，界面显示「定位失败」，绝不错误地标记别处。
 *
 * 为保证选中文本（可能含换行、多个空格）和重新渲染后的正文能对齐，
 * 这里先把空白折叠成单个空格，同时保存 normalized index -> raw index 的映射。
 */

export interface NormalizedText {
  text: string;
  map: number[]; // 长度 = text.length + 1，最后一项 = raw.length
}

export interface AnchorTarget {
  text: string;
  anchorBefore: string;
  anchorAfter: string;
}

export interface AnchorMatch {
  start: number; // 原始正文中的起点（含）
  end: number; // 原始正文中的终点（不含）
  normalizedStart: number;
  score: number;
  ambiguous: boolean;
}

export const CONTEXT_RADIUS = 48;

export function normalizeQuery(value: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeWithMap(raw: string): NormalizedText {
  const out: string[] = [];
  const map: number[] = [];
  let i = 0;
  let pendingSpace = false;
  let spaceAt = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (/\s/.test(ch)) {
      if (!pendingSpace) {
        pendingSpace = true;
        spaceAt = i;
      }
      i += 1;
      continue;
    }
    if (pendingSpace) {
      if (out.length > 0) {
        out.push(' ');
        map.push(spaceAt);
      }
      pendingSpace = false;
    }
    out.push(ch);
    map.push(i);
    i += 1;
  }
  map.push(raw.length);
  return { text: out.join(''), map };
}

function indexOfAll(haystack: string, needle: string): number[] {
  const result: number[] = [];
  if (!needle) return result;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    result.push(at);
    from = at + 1;
  }
  return result;
}

function collapseWhitespace(value: string): string {
  return (value || '').replace(/\s+/g, ' ');
}

/** 前后文打分：优先完全吻合，其次允许空白差异，最后按公共前/后缀给部分分。 */
function contextScore(actual: string, expected: string, isBefore: boolean): number {
  if (!expected) return 0.5;
  if (actual === expected) return 1;
  const a = actual.trim();
  const e = expected.trim();
  if (!e) return 0.5;
  if (a === e) return 0.95;
  return isBefore
    ? commonSuffixLength(a, e) / e.length
    : commonPrefixLength(a, e) / e.length;
}

function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1;
  return i;
}

/** 把原始文本下标换算为折叠后的下标。 */
export function normalizedIndexForRaw(normalized: NormalizedText, rawIndex: number): number {
  const { map } = normalized;
  let lo = 0;
  let hi = map.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (map[mid] <= rawIndex) lo = mid;
    else hi = mid - 1;
  }
  return Math.min(lo, normalized.text.length);
}

/** 由一次选区生成前后文锚点。start / end 是原始正文中的字符下标。 */
export function makeAnchors(
  raw: string,
  start: number,
  end: number,
  radius: number = CONTEXT_RADIUS
): { anchorBefore: string; anchorAfter: string; normalizedStart: number } {
  const normalized = normalizeWithMap(raw);
  const nStart = normalizedIndexForRaw(normalized, start);
  const nEnd = normalizedIndexForRaw(normalized, end);
  return {
    anchorBefore: normalized.text.slice(Math.max(0, nStart - radius), nStart),
    anchorAfter: normalized.text.slice(nEnd, nEnd + radius),
    normalizedStart: nStart,
  };
}

export function findAnchor(raw: string, target: AnchorTarget): AnchorMatch | null {
  const needle = normalizeQuery(target.text);
  if (!needle) return null;

  const normalized = normalizeWithMap(raw);
  const hay = normalized.text;
  const occurrences = indexOfAll(hay, needle);
  if (occurrences.length === 0) return null;

  // 上下文保留首尾空格：它们正是「原文片段与上下文之间的空白」，是重要匹配依据。
  const before = collapseWhitespace(target.anchorBefore).slice(-72);
  const after = collapseWhitespace(target.anchorAfter).slice(0, 72);

  let best: { at: number; score: number; exact: boolean } | null = null;
  for (const at of occurrences) {
    const prev = hay.slice(Math.max(0, at - before.length), at);
    const next = hay.slice(at + needle.length, at + needle.length + after.length);
    const beforeExact = !!before.trim() && (prev === before || prev.trim() === before.trim());
    const afterExact = !!after.trim() && (next === after || next.trim() === after.trim());

    const score = contextScore(prev, before, true) + contextScore(next, after, false);
    const exact = beforeExact || afterExact;
    if (!best || score > best.score + 1e-9) {
      best = { at, score, exact };
    }
  }

  if (!best) return null;
  const ambiguous = occurrences.length > 1;
  // 多处分歧时必须至少有一侧上下文完全吻合；单处命中但上下文强烈矛盾时也放弃。
  const reliable = ambiguous ? best.exact && best.score >= 1 : best.score >= 0.6;
  if (!reliable) return null;

  const endNormalized = best.at + needle.length;
  return {
    start: normalized.map[best.at],
    end: normalized.map[endNormalized],
    normalizedStart: best.at,
    score: best.score,
    ambiguous,
  };
}
