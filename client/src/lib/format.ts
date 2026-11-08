import type { Article, ArticleStatus, HighlightColor } from '../types';
import { STATUS_LABEL } from '../types';

export function uid(prefix = ''): string {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return prefix ? `${prefix}_${value}` : value;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${formatDate(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatRelative(ts: number | null | undefined): string {
  if (!ts) return '尚未阅读';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return formatDate(ts);
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(1, Math.round(minutes || 1));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} 小时 ${rest} 分` : `${h} 小时`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function statusLabel(status: ArticleStatus): string {
  return STATUS_LABEL[status] || '未读';
}

/** 低饱和度的书脊色，按来源稳定分配。 */
export const SPINE_PALETTE = [
  { name: '绛红', value: '#7c4a41' },
  { name: '松绿', value: '#4d5e4b' },
  { name: '靛蓝', value: '#41536b' },
  { name: '赭石', value: '#97784c' },
  { name: '瓦灰', value: '#5a5c5c' },
  { name: '绛紫', value: '#6b4e60' },
  { name: '黛青', value: '#3f6260' },
  { name: '墨棕', value: '#5a4635' },
] as const;

export function spineColorFor(article: Article): string {
  const key = article.tags?.[0] || article.siteName || hostnameOf(article.url) || article.title;
  return SPINE_PALETTE[hashString(key) % SPINE_PALETTE.length].value;
}

export function spineWidthFor(article: Article, mobile: boolean): number {
  const width = 34 + Math.min(30, Math.max(1, article.estReadMinutes || 1)) * 1.55;
  return Math.round(Math.max(mobile ? 46 : 36, Math.min(mobile ? 78 : 84, width)));
}

export function spineHeightFor(article: Article, mobile: boolean): number {
  const base = mobile ? 176 : 196;
  return base + (hashString(article.id) % (mobile ? 26 : 40));
}

export const HIGHLIGHT_COLORS: HighlightColor[] = ['sand', 'sage', 'rose', 'mist'];

export function nextHighlightColor(index: number): HighlightColor {
  return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
