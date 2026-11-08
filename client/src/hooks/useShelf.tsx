import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { articlesRepo, highlightsRepo } from '../lib/db';
import type { Article, Highlight } from '../types';

interface ShelfContextValue {
  articles: Article[];
  highlights: Highlight[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addArticle: (article: Article) => Promise<void>;
  updateArticle: (id: string, patch: Partial<Article>) => Promise<void>;
  removeArticle: (id: string) => Promise<void>;
  addHighlight: (highlight: Highlight) => Promise<void>;
  updateHighlight: (id: string, patch: Partial<Highlight>) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
}

const ShelfContext = createContext<ShelfContextValue | null>(null);

export function ShelfProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextArticles, nextHighlights] = await Promise.all([
        articlesRepo.all(),
        highlightsRepo.all(),
      ]);
      setArticles(nextArticles);
      setHighlights(nextHighlights);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `本地数据库打开失败：${err.message}。请确认浏览器未禁用站点数据。`
          : '本地数据库打开失败'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addArticle = useCallback(async (article: Article) => {
    await articlesRepo.put(article);
    setArticles((prev) => [...prev.filter((a) => a.id !== article.id), article]);
  }, []);

  const updateArticle = useCallback(async (id: string, patch: Partial<Article>) => {
    const next = await articlesRepo.patch(id, patch);
    if (next) setArticles((prev) => prev.map((a) => (a.id === id ? next : a)));
  }, []);

  const removeArticle = useCallback(async (id: string) => {
    await articlesRepo.remove(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setHighlights((prev) => prev.filter((h) => h.articleId !== id));
  }, []);

  const addHighlight = useCallback(async (highlight: Highlight) => {
    await highlightsRepo.put(highlight);
    setHighlights((prev) => [...prev.filter((h) => h.id !== highlight.id), highlight]);
  }, []);

  const updateHighlight = useCallback(async (id: string, patch: Partial<Highlight>) => {
    const next = await highlightsRepo.patch(id, patch);
    if (next) setHighlights((prev) => prev.map((h) => (h.id === id ? next : h)));
  }, []);

  const removeHighlight = useCallback(async (id: string) => {
    await highlightsRepo.remove(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const value = useMemo<ShelfContextValue>(
    () => ({
      articles,
      highlights,
      loading,
      error,
      refresh,
      addArticle,
      updateArticle,
      removeArticle,
      addHighlight,
      updateHighlight,
      removeHighlight,
    }),
    [
      articles, highlights, loading, error, refresh, addArticle, updateArticle,
      removeArticle, addHighlight, updateHighlight, removeHighlight,
    ]
  );

  return <ShelfContext.Provider value={value}>{children}</ShelfContext.Provider>;
}

export function useShelf(): ShelfContextValue {
  const ctx = useContext(ShelfContext);
  if (!ctx) throw new Error('useShelf 必须在 ShelfProvider 内使用');
  return ctx;
}
