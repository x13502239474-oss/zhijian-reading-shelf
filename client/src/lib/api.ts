import type { ExtractedArticle } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '';
const REQUEST_TIMEOUT_MS = 30_000;

export async function extractArticle(url: string): Promise<ExtractedArticle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('抓取超时，请稍后重试');
    }
    throw new Error('无法连接抓取服务，请确认后端已启动');
  } finally {
    clearTimeout(timer);
  }

  const data = (await response.json().catch(() => ({}))) as Partial<ExtractedArticle> & {
    error?: string;
  };
  if (!response.ok || !data.contentHtml) {
    throw new Error(data.error || `抓取失败（HTTP ${response.status}）`);
  }
  return data as ExtractedArticle;
}

export async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
