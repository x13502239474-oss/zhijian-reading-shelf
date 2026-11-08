/**
 * 核心算法自检：阅读时长估算、文本锚点定位、Markdown 导出。
 * 运行：npm run test:core
 */
import assert from 'node:assert/strict';
import { computeReadingStats } from '../client/src/lib/readingStats.ts';
import { findAnchor, makeAnchors, normalizeQuery } from '../client/src/lib/anchor.ts';
import { buildMarkdown } from '../client/src/lib/markdown.ts';
import { applyHighlight, buildTextIndex, clearMarks } from '../client/src/lib/domHighlights.ts';
import { JSDOM } from 'jsdom';
import type { Article, Highlight } from '../client/src/types/index.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

check('中英文分开估算阅读时长', () => {
  const zh = computeReadingStats('中'.repeat(700));
  assert.equal(zh.wordCount, 700);
  assert.equal(zh.estReadMinutes, 2);
  const en = computeReadingStats('word '.repeat(440).trim());
  assert.equal(en.wordCount, 440);
  assert.equal(en.estReadMinutes, 2);
  const mixed = computeReadingStats('中文'.repeat(175) + ' ' + 'hello '.repeat(110));
  assert.equal(mixed.estReadMinutes, 2);
});

check('空白折叠映射保持偏移可用', () => {
  assert.equal(normalizeQuery('  a \n  b  '), 'a b');
  const raw = '甲\n\n乙丙';
  const anchors = makeAnchors(raw, 3, 5);
  assert.equal(anchors.anchorBefore, '甲 ');
  const match = findAnchor(raw, {
    text: '乙丙',
    anchorBefore: anchors.anchorBefore,
    anchorAfter: anchors.anchorAfter,
  });
  assert.ok(match);
  assert.equal(raw.slice(match!.start, match!.end), '乙丙');
});

check('重复文本优先用前后文匹配到正确位置', () => {
  const raw = '第一段：这是重要的一句话，出现在开头。中间很多别的内容。第二段：这是重要的一句话，出现在结尾。';
  const target = '这是重要的一句话';
  const secondIndex = raw.lastIndexOf(target);
  const anchors = makeAnchors(raw, secondIndex, secondIndex + target.length, 16);
  const match = findAnchor(raw, { text: target, ...anchors });
  assert.ok(match, '应能定位');
  assert.equal(match!.start, secondIndex);
  assert.equal(match!.ambiguous, true);
});

check('找不到原文时返回 null，不做错误标记', () => {
  const raw = '这里完全没有任何相关内容。';
  assert.equal(findAnchor(raw, { text: '一句不存在的话', anchorBefore: '甲', anchorAfter: '乙' }), null);
});

check('多处同文且无上下文时拒绝猜测', () => {
  const raw = '重复 重复 重复';
  assert.equal(findAnchor(raw, { text: '重复', anchorBefore: '', anchorAfter: '' }), null);
});

check('Markdown 按文章分组且无批注的划线也导出', () => {
  const now = Date.now();
  const article: Article = {
    id: 'a1', url: 'https://example.com/a', title: '测试文章', siteName: 'Example',
    contentHtml: '<p>x</p>', contentText: 'x', wordCount: 1, estReadMinutes: 1,
    status: 'unread', progress: 0, addedAt: now,
  };
  const h1: Highlight = {
    id: 'h1', articleId: 'a1', text: '第一段划线', note: '',
    anchorBefore: '', anchorAfter: '', createdAt: now, position: 1,
  };
  const h2: Highlight = {
    id: 'h2', articleId: 'a1', text: '第二段划线', note: '我的想法',
    anchorBefore: '', anchorAfter: '', createdAt: now + 1, position: 2,
  };
  const md = buildMarkdown([article], [h1, h2]);
  assert.match(md, /# 测试文章/);
  assert.match(md, /> 第一段划线/);
  assert.match(md, /> 第二段划线/);
  assert.match(md, /批注：我的想法/);
  assert.match(md, /## 划线与批注/);
  assert.match(md, /来源：https:\/\/example.com\/a/);
  assert.equal((md.match(/---/g) || []).length >= 1, true);
});

check('DOM 划线可恢复、清除后正文不变', () => {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"><p>开头一段文字。</p><p>中间<strong>夹着</strong>关键的一句话，还有别的内容。</p><p>结尾段落。</p></div></body></html>'
  );
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.document = dom.window.document;
  globals.NodeFilter = dom.window.NodeFilter;
  globals.Node = dom.window.Node;

  const root = dom.window.document.getElementById('root') as unknown as HTMLElement;
  const original = root.textContent || '';
  const { raw } = buildTextIndex(root);
  assert.equal(raw, original);

  const target = '关键的一句话';
  const at = raw.indexOf(target);
  const anchors = makeAnchors(raw, at, at + target.length, 20);
  const match = findAnchor(raw, { text: target, ...anchors });
  assert.ok(match);
  assert.equal(applyHighlight(root, match!.start, match!.end, 'hl-1', 'sand'), true);
  const mark = root.querySelector('mark[data-hl="hl-1"]');
  assert.ok(mark, '应生成 mark');
  assert.equal(root.textContent, original, '恢复划线后纯文本必须不变');

  clearMarks(root);
  assert.equal(root.querySelectorAll('mark').length, 0);
  assert.equal(root.textContent, original, '清除划线后纯文本必须不变');
});

console.log(`\n全部 ${passed} 项核心自检通过。`);
