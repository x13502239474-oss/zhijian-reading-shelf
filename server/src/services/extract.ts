import iconv from 'iconv-lite';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { computeReadingStats } from './readingTime.js';

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

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36 ZhijianReader/1.0';
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 8 * 1024 * 1024;

/** 只接受 http/https，拒绝凭据、非标准端口协议与本地地址。 */
export function validateUrl(raw: string): URL {
  if (!raw || typeof raw !== 'string') {
    throw new Error('请输入文章 URL');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('URL 格式不正确，请粘贴完整的 http(s) 链接');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('只支持 http / https 链接');
  }
  if (parsed.username || parsed.password) {
    throw new Error('链接中包含账号信息，已拒绝抓取');
  }
  if (!parsed.hostname) {
    throw new Error('URL 缺少域名');
  }
  return parsed;
}

function detectCharset(contentType: string, buffer: Buffer): string {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType);
  let charset = fromHeader ? fromHeader[1] : '';
  if (!charset) {
    const head = buffer.subarray(0, 4096).toString('latin1');
    const fromMeta = /<meta[^>]*charset\s*=\s*["']?\s*([\w-]+)/i.exec(head);
    charset = fromMeta ? fromMeta[1] : 'utf-8';
  }
  charset = charset.toLowerCase();
  if (charset === 'gb2312' || charset === 'gbk' || charset === 'gb-2312') return 'gb18030';
  return charset;
}

function decodeBody(buffer: Buffer, charset: string): string {
  if (charset === 'utf-8' || charset === 'utf8' || charset === 'us-ascii' || charset === 'ascii') {
    return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  }
  if (iconv.encodingExists(charset)) {
    return iconv.decode(buffer, charset);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'AbortError' || /abort/i.test(error.message))) {
      throw new Error('抓取超时（20 秒），该网站可能响应过慢');
    }
    throw new Error(`无法连接该网站：${error instanceof Error ? error.message : '网络错误'}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`网页返回 ${response.status} ${response.statusText || ''}`.trim());
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
    throw new Error(`该链接不是网页（${contentType.split(';')[0]}），请复制文章页地址`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    throw new Error('网页体积超过 8 MB，已跳过');
  }
  return decodeBody(buffer, detectCharset(contentType, buffer));
}

function metaContent(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    const value = el?.getAttribute('content')?.trim();
    if (value) return value;
  }
  return '';
}

/** 把 Readability 的输出再清洗一遍：绝对化链接、去脚本、给标题加 id 以便生成目录。 */
function cleanReadableHtml(fragment: string, baseUrl: string): string {
  const dom = new JSDOM(`<!doctype html><html><body><div id="__root">${fragment}</div></body></html>`, {
    url: baseUrl,
  });
  const doc = dom.window.document;
  const root = doc.getElementById('__root')!;

  root.querySelectorAll('script,style,noscript,iframe,object,embed,form,button,input,textarea,select,svg,canvas,video,audio').forEach((el) => el.remove());

  root.querySelectorAll('*').forEach((el) => {
    // 清除全部事件属性与行内样式，避免原站样式破坏阅读排版
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'style' || name === 'class' || name === 'id' || name === 'srcdoc') {
        el.removeAttribute(attr.name);
      }
    });
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') {
      const src = el.getAttribute('src');
      if (src) {
        try {
          el.setAttribute('src', new URL(src, baseUrl).toString());
        } catch {
          el.removeAttribute('src');
        }
      }
      el.removeAttribute('srcset');
      el.setAttribute('loading', 'lazy');
      el.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (tag === 'a') {
      const href = el.getAttribute('href');
      if (href) {
        try {
          el.setAttribute('href', new URL(href, baseUrl).toString());
        } catch {
          el.removeAttribute('href');
        }
      }
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    if (/^h[1-6]$/.test(tag)) {
      el.setAttribute('id', `toc-${Math.random().toString(36).slice(2, 10)}`);
    }
  });

  // 去掉没有内容也没有图片的空节点
  let changed = true;
  while (changed) {
    changed = false;
    root.querySelectorAll('p,div,span,section,figure').forEach((el) => {
      if (!el.textContent?.trim() && !el.querySelector('img')) {
        el.remove();
        changed = true;
      }
    });
  }
  return root.innerHTML;
}

export async function extractArticle(html: string, url: string): Promise<ExtractedArticle> {
  const dom = new JSDOM(html, { url, contentType: 'text/html' });
  const doc = dom.window.document;

  const parsed = new Readability(doc, { charThreshold: 80 }).parse();
  if (!parsed || !parsed.content || parsed.content.trim().length < 40) {
    throw new Error('未能从这个页面提取到正文，可能是登录墙、动态渲染或纯图片页面');
  }

  const target = new URL(url);
  const ogTitle = metaContent(doc, [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  ]);
  const ogSite = metaContent(doc, ['meta[property="og:site_name"]']);
  const siteName =
    parsed.siteName?.trim() || ogSite || target.hostname.replace(/^www\./, '');
  const title = (parsed.title?.trim() || ogTitle || doc.title || target.hostname).trim();

  const contentHtml = cleanReadableHtml(parsed.content, url);
  const outputDom = new JSDOM(`<!doctype html><body><div id="__measure">${contentHtml}</div></body>`);
  const contentText = (outputDom.window.document.getElementById('__measure')?.textContent || '')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const stats = computeReadingStats(parsed.textContent || contentText);

  return {
    url,
    title,
    siteName,
    contentHtml,
    contentText,
    wordCount: stats.wordCount,
    estReadMinutes: stats.estReadMinutes,
    excerpt: (parsed.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 240),
  };
}

export async function extractFromUrl(rawUrl: string): Promise<ExtractedArticle> {
  const target = validateUrl(rawUrl);
  const html = await fetchHtml(target.toString());
  return extractArticle(html, target.toString());
}
