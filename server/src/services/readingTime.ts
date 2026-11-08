/**
 * 中英文分开估算阅读时长。
 * - 中日韩文字按「字」计，约 350 字 / 分钟
 * - 拉丁字母按「词」计，约 220 词 / 分钟
 * 混合文章分别计算后相加，而不是把所有字符当成英文单词。
 */

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g;
const LATIN_WORD_RE = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;

export interface ReadingStats {
  wordCount: number;
  estReadMinutes: number;
  cjkCount: number;
  wordTokens: number;
}

export const CJK_CHARS_PER_MINUTE = 350;
export const WORDS_PER_MINUTE = 220;

export function computeReadingStats(text: string): ReadingStats {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const cjkCount = (clean.match(CJK_RE) || []).length;
  const withoutCjk = clean.replace(CJK_RE, ' ');
  const wordTokens = (withoutCjk.match(LATIN_WORD_RE) || []).length;
  const wordCount = cjkCount + wordTokens;
  const rawMinutes = cjkCount / CJK_CHARS_PER_MINUTE + wordTokens / WORDS_PER_MINUTE;
  const estReadMinutes = Math.max(1, Math.ceil(rawMinutes));
  return { wordCount, estReadMinutes, cjkCount, wordTokens };
}
