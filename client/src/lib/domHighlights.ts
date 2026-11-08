/** 把文本偏移映射回真实 DOM，并用 <mark> 恢复划线。全程只依赖文本内容，不依赖节点路径。 */

export interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

export interface SelectionInfo {
  start: number;
  end: number;
  text: string;
  rect: DOMRect | null;
}

export interface TextIndex {
  raw: string;
  segments: TextSegment[];
}

export function buildTextIndex(root: HTMLElement): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  const parts: string[] = [];
  let offset = 0;
  let node: Node | null = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const parentTag = textNode.parentElement?.tagName || '';
    if (!/^(SCRIPT|STYLE|NOSCRIPT)$/.test(parentTag) && textNode.data.length > 0) {
      segments.push({ node: textNode, start: offset, end: offset + textNode.data.length });
      parts.push(textNode.data);
      offset += textNode.data.length;
    }
    node = walker.nextNode();
  }
  return { raw: parts.join(''), segments };
}

/** 移除所有由本阅读器生成的 mark，并合并被切碎的文本节点。 */
export function clearMarks(root: HTMLElement): void {
  const marks = Array.from(root.querySelectorAll('mark[data-hl]'));
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }
  root.normalize();
}

/** 在 [start, end) 范围内逐文本节点包裹 mark；返回是否至少包裹了一段。 */
export function applyHighlight(
  root: HTMLElement,
  start: number,
  end: number,
  id: string,
  color: string
): boolean {
  if (end <= start) return false;
  const { segments } = buildTextIndex(root);
  let applied = false;
  for (const segment of segments) {
    const from = Math.max(start, segment.start);
    const to = Math.min(end, segment.end);
    if (from >= to) continue;
    try {
      const range = document.createRange();
      range.setStart(segment.node, from - segment.start);
      range.setEnd(segment.node, to - segment.start);
      const mark = document.createElement('mark');
      mark.dataset.hl = id;
      mark.className = `reader-hl reader-hl--${color}`;
      mark.setAttribute('tabindex', '0');
      mark.setAttribute('role', 'button');
      range.surroundContents(mark);
      applied = true;
    } catch {
      // 单个节点失败不影响其他片段
    }
  }
  return applied;
}

export function getSelectionInfo(root: HTMLElement): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  try {
    const before = range.cloneRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const text = range.toString();
    if (!text.trim()) return null;
    let rect: DOMRect | null = null;
    try {
      const r = range.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) rect = r;
    } catch {
      rect = null;
    }
    return { start, end: start + text.length, text, rect };
  } catch {
    return null;
  }
}

export function scrollToOffset(root: HTMLElement, start: number, smooth = true): void {
  const { segments } = buildTextIndex(root);
  const segment = segments.find((s) => start >= s.start && start < s.end) || segments[0];
  if (!segment) return;
  try {
    const range = document.createRange();
    range.setStart(segment.node, Math.max(0, Math.min(start - segment.start, segment.node.data.length)));
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    const target = window.scrollY + rect.top - Math.min(180, window.innerHeight * 0.28);
    window.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
  } catch {
    // 忽略
  }
}

export function scrollToMark(root: HTMLElement, id: string, smooth = true): boolean {
  const mark = root.querySelector<HTMLElement>(`mark[data-hl="${CSS.escape(id)}"]`);
  if (!mark) return false;
  const rect = mark.getBoundingClientRect();
  const target = window.scrollY + rect.top - Math.min(180, window.innerHeight * 0.28);
  window.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
  return true;
}

export function clearSelection(): void {
  const selection = window.getSelection();
  if (selection) selection.removeAllRanges();
}
