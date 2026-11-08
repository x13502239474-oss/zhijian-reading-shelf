export type ArticleStatus = 'unread' | 'reading' | 'finished' | 'archived';

/** 核心字段与需求文档保持一致；其余为可选的扩展字段。 */
export interface Article {
  id: string;
  url: string;
  title: string;
  siteName: string;
  contentHtml: string;
  contentText: string;
  wordCount: number;
  estReadMinutes: number;
  status: ArticleStatus;
  progress: number; // 0 ~ 1
  addedAt: number;
  // —— 扩展字段 ——
  lastReadAt?: number | null;
  scrollTop?: number; // 上次阅读位置（px）
  updatedAt?: number;
  excerpt?: string;
  isManual?: boolean; // 手动补录的正文
  tags?: string[];
  savedFallbackUrl?: string;
}

/** 划线采用纯文本锚点定位，不依赖 DOM Path。 */
export interface Highlight {
  id: string;
  articleId: string;
  text: string;
  note: string;
  anchorBefore: string;
  anchorAfter: string;
  createdAt: number;
  // —— 扩展字段 ——
  color?: HighlightColor;
  updatedAt?: number;
  position?: number; // 归一化正文中的起点，用于排序
  locateFailed?: boolean; // 仅运行时标记，不写入数据库
}

export type HighlightColor = 'sand' | 'sage' | 'rose' | 'mist';

export interface ExtractedArticle {
  url: string;
  title: string;
  siteName: string;
  contentHtml: string;
  contentText: string;
  wordCount: number;
  estReadMinutes: number;
  excerpt: string;
}

export interface ManualQueueItem {
  url: string;
  error: string;
  addedAt: number;
}

export type ReadingTheme = 'warm' | 'white' | 'eye' | 'night';
export type ReaderFont = 'serif' | 'song' | 'sans';

export interface ReadingSettings {
  theme: ReadingTheme;
  fontSize: number;
  lineHeight: number;
  fontFamily: ReaderFont;
  contentWidth: number;
  columns: 1 | 2;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export type ShelfFilter = 'all' | ArticleStatus;
export type ShelfSort = 'addedAt' | 'lastReadAt' | 'estReadMinutes' | 'title';
export type ShelfView = 'shelf' | 'list';

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  unread: '未读',
  reading: '阅读中',
  finished: '已完成',
  archived: '已归档',
};

export const FILTER_LABEL: Record<ShelfFilter, string> = {
  all: '全部文章',
  unread: '未读',
  reading: '阅读中',
  finished: '已完成',
  archived: '已归档',
};

export const SORT_LABEL: Record<ShelfSort, string> = {
  addedAt: '添加时间',
  lastReadAt: '最近阅读',
  estReadMinutes: '阅读时长',
  title: '标题',
};

export const THEME_LABEL: Record<ReadingTheme, string> = {
  warm: '暖光',
  white: '白纸',
  eye: '护眼',
  night: '夜间',
};

export const HIGHLIGHT_COLOR_LABEL: Record<HighlightColor, string> = {
  sand: '沙色',
  sage: '鼠尾草',
  rose: '藕荷',
  mist: '雾蓝',
};
