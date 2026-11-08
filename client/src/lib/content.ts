import type { TocItem } from '../types';

/** 客户端再做一次白名单清洗，保证本地存储的正文重新渲染时不会执行脚本。 */
const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT',
  'BUTTON', 'TEXTAREA', 'SELECT', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'LINK',
  'META', 'BASE', 'TEMPLATE',
]);
const KEEP_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'loading', 'referrerpolicy', 'target', 'rel',
  'colspan', 'rowspan',
]);

function safeUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  return !v.startsWith('javascript:') && !v.startsWith('data:text/html') && !v.startsWith('vbscript:');
}

export interface PreparedContent {
  html: string;
  toc: TocItem[];
}

export function prepareContent(source: string): PreparedContent {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body><div id="__paper">${source || ''}</div></body></html>`,
    'text/html'
  );
  const root = doc.getElementById('__paper');
  if (!root) return { html: '', toc: [] };

  Array.from(root.querySelectorAll('*')).forEach((el) => {
    if (DROP_TAGS.has(el.tagName)) {
      el.remove();
      return;
    }
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (!KEEP_ATTRS.has(name) || !safeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  const toc: TocItem[] = [];
  const usedIds = new Set<string>();
  let counter = 0;
  Array.from(root.querySelectorAll('h1,h2,h3,h4')).forEach((heading) => {
    const text = (heading.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    let id = heading.getAttribute('id') || '';
    if (!id || usedIds.has(id)) {
      id = `sec-${++counter}-${Math.random().toString(36).slice(2, 7)}`;
    }
    usedIds.add(id);
    heading.setAttribute('id', id);
    toc.push({
      id,
      text: text.slice(0, 80),
      level: Number(heading.tagName.slice(1)),
    });
  });

  return { html: root.innerHTML, toc };
}
