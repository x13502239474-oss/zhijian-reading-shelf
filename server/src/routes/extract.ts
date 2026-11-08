import { Router } from 'express';
import { extractFromUrl, validateUrl } from '../services/extract.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: '纸间阅读器抓取服务', time: Date.now() });
});

/**
 * POST /api/extract  { url: string }
 * 单篇抓取。批量添加由前端逐条调用，保证每条 URL 的状态互相独立。
 */
apiRouter.post('/extract', async (req, res) => {
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  try {
    validateUrl(raw);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'URL 无效' });
    return;
  }

  try {
    const article = await extractFromUrl(raw);
    res.json(article);
  } catch (error) {
    const message = error instanceof Error ? error.message : '抓取失败，原因未知';
    console.warn(`[extract] ${raw} -> ${message}`);
    res.status(422).json({ error: message, url: raw });
  }
});
