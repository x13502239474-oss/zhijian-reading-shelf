/** 与后端保持一致的估算规则，用于手动补录正文时本地计算。 */
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g;
const LATIN_WORD_RE = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;

export function computeReadingStats(text: string): {
  wordCount: number;
  estReadMinutes: number;
} {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const cjk = (clean.match(CJK_RE) || []).length;
  const words = (clean.replace(CJK_RE, ' ').match(LATIN_WORD_RE) || []).length;
  return {
    wordCount: cjk + words,
    estReadMinutes: Math.max(1, Math.ceil(cjk / 350 + words / 220)),
  };
}

export function paragraphsToHtml(text: string): string {
  const blocks = (text || '')
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return '';
  return blocks
    .map((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      const escaped = lines
        .map((line) =>
          line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        )
        .join('<br />');
      return `<p>${escaped}</p>`;
    })
    .join('\n');
}
