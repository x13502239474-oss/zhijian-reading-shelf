import type { Article, Highlight } from '../types';
import { formatDate } from './format';

function quote(text: string): string {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function noteLines(note: string): string {
  return (note || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line, index) => (index === 0 ? `批注：${line}` : line))
    .join('\n');
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80) || '导出';
}

/**
 * 按文章分组导出。没有批注的划线只导出引用；多篇文章之间用 --- 分隔。
 */
export function buildMarkdown(articles: Article[], highlights: Highlight[]): string {
  const byArticle = new Map<string, Highlight[]>();
  for (const h of highlights) {
    const list = byArticle.get(h.articleId) || [];
    list.push(h);
    byArticle.set(h.articleId, list);
  }

  const orderedArticles = [...articles].sort((a, b) => a.addedAt - b.addedAt);
  const sections: string[] = [];

  for (const article of orderedArticles) {
    const list = (byArticle.get(article.id) || []).slice().sort((a, b) => {
      if (typeof a.position === 'number' && typeof b.position === 'number') {
        return a.position - b.position;
      }
      return a.createdAt - b.createdAt;
    });
    if (list.length === 0) continue;

    const lines: string[] = [
      `# ${article.title}`,
      '',
      `来源：${article.url}`,
      `网站：${article.siteName}`,
      `收藏时间：${formatDate(article.addedAt)}`,
      '',
      '## 划线与批注',
      '',
    ];

    list.forEach((h, index) => {
      if (index > 0) lines.push('---', '');
      lines.push(quote(h.text));
      if (h.note && h.note.trim()) {
        lines.push('', noteLines(h.note.trim()));
      }
      lines.push('');
    });

    sections.push(lines.join('\n').trimEnd());
  }

  if (sections.length === 0) return '';
  return `# 纸间 · 划线与批注\n\n${sections.join('\n\n---\n\n')}\n`;
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName(filename)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('浏览器拒绝了复制操作');
}
