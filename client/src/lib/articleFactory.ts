import type { Article, ExtractedArticle } from '../types';
import { hostnameOf, uid } from './format';
import { computeReadingStats, paragraphsToHtml } from './readingStats';

export function articleFromExtraction(data: ExtractedArticle): Article {
  const now = Date.now();
  return {
    id: uid('art'),
    url: data.url,
    title: data.title || hostnameOf(data.url),
    siteName: data.siteName || hostnameOf(data.url),
    contentHtml: data.contentHtml,
    contentText: data.contentText,
    wordCount: data.wordCount,
    estReadMinutes: data.estReadMinutes,
    status: 'unread',
    progress: 0,
    addedAt: now,
    lastReadAt: null,
    scrollTop: 0,
    excerpt: data.excerpt,
    updatedAt: now,
  };
}

export interface ManualArticleInput {
  url: string;
  title?: string;
  body: string;
}

export function articleFromManual(input: ManualArticleInput): Article {
  const now = Date.now();
  const raw = input.body.trim();
  const stats = computeReadingStats(raw);
  return {
    id: uid('art'),
    url: input.url,
    title: input.title?.trim() || hostnameOf(input.url) || '手动补录的文章',
    siteName: hostnameOf(input.url),
    contentHtml: paragraphsToHtml(raw),
    contentText: raw,
    wordCount: stats.wordCount,
    estReadMinutes: stats.estReadMinutes,
    status: 'unread',
    progress: 0,
    addedAt: now,
    lastReadAt: null,
    scrollTop: 0,
    isManual: true,
    updatedAt: now,
  };
}
