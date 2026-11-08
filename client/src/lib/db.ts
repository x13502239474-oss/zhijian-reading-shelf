import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Article, ArticleStatus, Highlight, ManualQueueItem } from '../types';

const DB_NAME = 'zhijian-reading-shelf';
const DB_VERSION = 1;

interface MetaRecord {
  key: string;
  value: unknown;
}

interface ShelfSchema extends DBSchema {
  articles: {
    key: string;
    value: Article;
    indexes: {
      'by-addedAt': number;
      'by-status': ArticleStatus;
      'by-url': string;
      'by-lastReadAt': number;
    };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: {
      'by-articleId': string;
      'by-createdAt': number;
    };
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<ShelfSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<ShelfSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ShelfSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const articles = db.createObjectStore('articles', { keyPath: 'id' });
        articles.createIndex('by-addedAt', 'addedAt');
        articles.createIndex('by-status', 'status');
        articles.createIndex('by-url', 'url');
        articles.createIndex('by-lastReadAt', 'lastReadAt');

        const highlights = db.createObjectStore('highlights', { keyPath: 'id' });
        highlights.createIndex('by-articleId', 'articleId');
        highlights.createIndex('by-createdAt', 'createdAt');

        db.createObjectStore('meta', { keyPath: 'key' });
      },
      blocked() {
        console.warn('[纸间] IndexedDB 升级被其他标签页阻塞，请关闭其他打开的页面。');
      },
    });
  }
  return dbPromise;
}

export const articlesRepo = {
  async all(): Promise<Article[]> {
    return (await getDB()).getAll('articles');
  },
  async get(id: string): Promise<Article | undefined> {
    return (await getDB()).get('articles', id);
  },
  async findByUrl(url: string): Promise<Article | undefined> {
    return (await getDB()).getFromIndex('articles', 'by-url', url);
  },
  async put(article: Article): Promise<void> {
    await (await getDB()).put('articles', article);
  },
  async patch(id: string, changes: Partial<Article>): Promise<Article | undefined> {
    const db = await getDB();
    const tx = db.transaction('articles', 'readwrite');
    const current = await tx.store.get(id);
    if (!current) {
      await tx.done;
      return undefined;
    }
    const next: Article = { ...current, ...changes, updatedAt: Date.now() };
    await tx.store.put(next);
    await tx.done;
    return next;
  },
  async remove(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['articles', 'highlights'], 'readwrite');
    await tx.objectStore('articles').delete(id);
    const keys = await tx.objectStore('highlights').index('by-articleId').getAllKeys(id);
    for (const key of keys) {
      await tx.objectStore('highlights').delete(key);
    }
    await tx.done;
  },
};

export const highlightsRepo = {
  async all(): Promise<Highlight[]> {
    return (await getDB()).getAll('highlights');
  },
  async byArticle(articleId: string): Promise<Highlight[]> {
    return (await getDB()).getAllFromIndex('highlights', 'by-articleId', articleId);
  },
  async put(highlight: Highlight): Promise<void> {
    await (await getDB()).put('highlights', highlight);
  },
  async patch(id: string, changes: Partial<Highlight>): Promise<Highlight | undefined> {
    const db = await getDB();
    const tx = db.transaction('highlights', 'readwrite');
    const current = await tx.store.get(id);
    if (!current) {
      await tx.done;
      return undefined;
    }
    const next: Highlight = { ...current, ...changes, updatedAt: Date.now() };
    await tx.store.put(next);
    await tx.done;
    return next;
  },
  async remove(id: string): Promise<void> {
    await (await getDB()).delete('highlights', id);
  },
};

export const metaRepo = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const record = await (await getDB()).get('meta', key);
    return record ? (record.value as T) : fallback;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await (await getDB()).put('meta', { key, value });
  },
};

export const MANUAL_QUEUE_KEY = 'manualQueue';

export async function getManualQueue(): Promise<ManualQueueItem[]> {
  return metaRepo.get<ManualQueueItem[]>(MANUAL_QUEUE_KEY, []);
}

export async function pushManualQueue(item: ManualQueueItem): Promise<ManualQueueItem[]> {
  const list = await getManualQueue();
  const next = [item, ...list.filter((i) => i.url !== item.url)].slice(0, 100);
  await metaRepo.set(MANUAL_QUEUE_KEY, next);
  return next;
}

export async function popManualQueue(url: string): Promise<ManualQueueItem[]> {
  const list = await getManualQueue();
  const next = list.filter((i) => i.url !== url);
  await metaRepo.set(MANUAL_QUEUE_KEY, next);
  return next;
}
