import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  ArrowLeft, Check, Copy, FileDown, Highlighter, ListTree, Settings2, StickyNote, X,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ReaderToolbar } from '../components/reader/ReaderToolbar';
import { ReaderSettingsPanel } from '../components/reader/ReaderSettingsPanel';
import { TableOfContents } from '../components/reader/TableOfContents';
import { SelectionMenu } from '../components/reader/SelectionMenu';
import { ReadingRibbon } from '../components/reader/ReadingRibbon';
import { MarginNotes } from '../components/reader/MarginNotes';
import { useToast } from '../components/ui/ToastProvider';
import { useShelf } from '../hooks/useShelf';
import { useReadingSettings } from '../hooks/useReadingSettings';
import { useHasNoteRail, useIsMobile } from '../hooks/useMediaQuery';
import { findAnchor, makeAnchors } from '../lib/anchor';
import {
  applyHighlight, clearMarks, clearSelection, getSelectionInfo,
  scrollToMark, type SelectionInfo,
} from '../lib/domHighlights';
import { prepareContent } from '../lib/content';
import { articlesRepo } from '../lib/db';
import { clamp, formatDate, formatMinutes, uid } from '../lib/format';
import { buildMarkdown, copyText, downloadMarkdown } from '../lib/markdown';
import type { Article, Highlight, HighlightColor, ReadingSettings, TocItem } from '../types';

const FONT_VAR: Record<ReadingSettings['fontFamily'], string> = {
  serif: 'var(--font-book)',
  song: 'var(--font-song)',
  sans: 'var(--font-ui)',
};

export default function ReaderPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { articles, highlights, loading, updateArticle, addHighlight, updateHighlight, removeHighlight } = useShelf();
  const { toast } = useToast();
  const { settings, update: updateSettings, reset: resetSettings } = useReadingSettings();
  const isMobile = useIsMobile();
  const hasRail = useHasNoteRail();

  const article = useMemo(() => articles.find((a) => a.id === id), [articles, id]);
  const articleRef = useRef(article);
  articleRef.current = article;

  const prepared = useMemo(() => prepareContent(article?.contentHtml || ''), [article?.contentHtml]);
  const articleHighlights = useMemo(
    () =>
      highlights
        .filter((h) => h.articleId === id)
        .sort((a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt)),
    [highlights, id]
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const noteRailRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const menuActiveRef = useRef(false);

  const [progress, setProgress] = useState(article?.progress || 0);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [notePositions, setNotePositions] = useState<{ id: string; top: number }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  useEffect(() => { menuActiveRef.current = !!selection; }, [selection]);

  const toc: TocItem[] = prepared.toc;
  const focusHighlight = searchParams.get('highlight');

  /* ---------- 划线恢复：文本锚点 ---------- */
  const layoutNotes = useCallback(() => {
    const rail = noteRailRef.current;
    const body = contentRef.current;
    if (!hasRail || isMobile || !rail || !body) {
      setNotePositions((prev) => (prev.length ? [] : prev));
      return;
    }
    const railTop = rail.getBoundingClientRect().top;
    const items: { id: string; top: number }[] = [];
    for (const h of articleHighlights) {
      const mark = body.querySelector<HTMLElement>(`mark[data-hl="${CSS.escape(h.id)}"]`);
      if (mark) items.push({ id: h.id, top: mark.getBoundingClientRect().top - railTop });
    }
    items.sort((a, b) => a.top - b.top);
    let last = -160;
    const spaced = items.map((item) => {
      const top = Math.max(item.top, last + 112);
      last = top;
      return { ...item, top };
    });
    setNotePositions(spaced);
  }, [articleHighlights, hasRail, isMobile]);

  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root || !prepared.html) return;
    clearMarks(root);
    const raw = root.textContent || '';

    const resolved: { h: Highlight; start: number; end: number }[] = [];
    let failed = 0;
    for (const h of articleHighlights) {
      const match = findAnchor(raw, h);
      if (match) resolved.push({ h, start: match.start, end: match.end });
      else failed += 1;
    }
    resolved.sort((a, b) => a.start - b.start || b.end - a.end);
    let lastEnd = -1;
    for (const item of resolved) {
      if (item.start < lastEnd) continue; // 重叠划线跳过，避免嵌套 mark
      if (applyHighlight(root, item.start, item.end, item.h.id, item.h.color || 'sand')) {
        lastEnd = item.end;
      }
    }
    setFailedCount(failed);
    const raf = requestAnimationFrame(layoutNotes);
    return () => cancelAnimationFrame(raf);
  }, [
    prepared.html, articleHighlights, layoutNotes,
    settings.fontSize, settings.lineHeight, settings.fontFamily,
    settings.contentWidth, settings.columns,
  ]);

  useEffect(() => {
    const onResize = () => requestAnimationFrame(layoutNotes);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [layoutNotes]);

  /* ---------- 恢复阅读位置 ---------- */
  useEffect(() => {
    const current = articleRef.current;
    if (!current || !prepared.html || restoredRef.current) return;
    restoredRef.current = true;
    const saved = current.scrollTop ??
      (current.progress || 0) * Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const focusId = focusHighlight;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        window.scrollTo(0, Math.max(0, saved));
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setProgress(clamp(window.scrollY / max, 0, 1));
        if (focusId && contentRef.current) {
          window.setTimeout(() => {
            if (contentRef.current) scrollToMark(contentRef.current, focusId, false);
            setActiveId(focusId);
          }, 160);
        }
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [prepared.html, focusHighlight]);

  /* ---------- 阅读进度自动保存 ---------- */
  const lastPercentRef = useRef(-1);

  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const value = clamp(window.scrollY / max, 0, 1);
      // 只在百分比变化时刷新界面，避免移动端滚动时每帧重渲染整篇正文
      const percent = Math.round(value * 100);
      if (percent !== lastPercentRef.current) {
        lastPercentRef.current = percent;
        setProgress(value);
      }
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const current = articleRef.current;
        if (!current) return;
        const patch: Partial<Article> = {
          progress: value,
          scrollTop: window.scrollY,
          lastReadAt: Date.now(),
        };
        if (current.status === 'unread' && value > 0.01) patch.status = 'reading';
        void updateArticle(id, patch);
      }, 700);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer) window.clearTimeout(timer);
      const current = articleRef.current;
      if (current) {
        void articlesRepo.patch(id, {
          progress: clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight), 0, 1),
          scrollTop: window.scrollY,
          lastReadAt: Date.now(),
        });
      }
    };
  }, [id, updateArticle]);

  /* ---------- 键盘翻页 ---------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        window.scrollBy({ top: -window.innerHeight * 0.85, behavior: 'smooth' });
      } else if (event.key === 'Escape') {
        setSelection(null);
        setTocOpen(false);
        setNotesOpen(false);
        setSettingsOpen(false);
        setExportSheetOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- 选中文字 ---------- */
  useEffect(() => {
    let timer: number | undefined;
    const onChange = () => {
      const current = window.getSelection();
      if (menuActiveRef.current && (!current || current.isCollapsed)) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const root = contentRef.current;
        if (!root) return;
        setSelection(getSelectionInfo(root));
      }, 180);
    };
    // 触摸选词在部分 Safari 版本上 selectionchange 触发不稳定，补一层抬手检测
    const onRelease = () => {
      window.setTimeout(() => {
        const root = contentRef.current;
        if (root) setSelection(getSelectionInfo(root));
      }, 80);
    };
    document.addEventListener('selectionchange', onChange);
    document.addEventListener('pointerup', onRelease);
    document.addEventListener('touchend', onRelease);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      document.removeEventListener('pointerup', onRelease);
      document.removeEventListener('touchend', onRelease);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!selection) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.selection-menu, .selection-sheet')) return;
      setSelection(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [selection]);

  /* ---------- 交互 ---------- */
  const createHighlight = async (color: HighlightColor, withNote: boolean) => {
    const info = selection;
    const root = contentRef.current;
    if (!info || !root || !article) return;
    const raw = root.textContent || '';
    const anchors = makeAnchors(raw, info.start, info.end);
    const highlight: Highlight = {
      id: uid('hl'),
      articleId: id,
      text: info.text.trim(),
      note: '',
      anchorBefore: anchors.anchorBefore,
      anchorAfter: anchors.anchorAfter,
      createdAt: Date.now(),
      color,
      position: anchors.normalizedStart,
    };
    await addHighlight(highlight);
    clearSelection();
    setSelection(null);
    setActiveId(highlight.id);
    if (withNote && !hasRail) setNotesOpen(true);
    toast(withNote ? '划线已保存，可以写批注了' : '已添加划线', 'success');
  };

  const copySelection = async () => {
    if (!selection) return;
    try {
      await copyText(selection.text);
      toast('已复制选中文字', 'success');
    } catch {
      toast('复制失败，请手动复制', 'error');
    }
    clearSelection();
    setSelection(null);
  };

  const onContentClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-hl]');
    const highlightId = target?.dataset.hl;
    if (!highlightId) return;
    setActiveId(highlightId);
    if (!hasRail || isMobile) setNotesOpen(true);
  };

  const jumpToHighlight = (highlightId: string) => {
    if (contentRef.current) {
      const ok = scrollToMark(contentRef.current, highlightId);
      if (!ok) toast('该划线未能在当前正文中定位', 'error');
    }
    setActiveId(highlightId);
    setNotesOpen(false);
  };

  const saveNote = async (highlightId: string, note: string) => {
    await updateHighlight(highlightId, { note });
    toast('批注已保存', 'success');
  };

  const deleteHighlight = async (highlightId: string) => {
    await removeHighlight(highlightId);
    if (activeId === highlightId) setActiveId(null);
    toast('划线已删除', 'success');
  };

  const jumpToc = (tocId: string) => {
    const el = document.getElementById(tocId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTocOpen(false);
  };

  const seek = (value: number) => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: value * max, behavior: 'auto' });
    setProgress(value);
  };

  const markFinished = async () => {
    const current = articleRef.current;
    if (!current) return;
    const next = current.status === 'finished' ? 'reading' : 'finished';
    await updateArticle(id, { status: next });
    toast(next === 'finished' ? '已标记为读完' : '已移回阅读中', 'success');
  };

  const exportMarkdown = async (mode: 'copy' | 'download') => {
    const current = articleRef.current;
    if (!current) return;
    const md = buildMarkdown([current], articleHighlights);
    if (!md) {
      toast('这篇文章还没有划线，暂无内容可导出', 'info');
      return;
    }
    if (mode === 'copy') {
      try {
        await copyText(md);
        toast('Markdown 已复制到剪贴板', 'success');
      } catch {
        toast('复制失败，请改用下载', 'error');
      }
    } else {
      downloadMarkdown(`${current.title}-划线与批注`, md);
      toast('Markdown 已下载', 'success');
    }
    setExportSheetOpen(false);
  };

  /* ---------- 渲染 ---------- */
  if (loading) {
    return (
      <div className="reader-root">
        <div className="empty"><p className="empty__text">正在打开这本书…</p></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="reader-root">
        <div className="empty">
          <div className="empty__title">没有找到这篇文章</div>
          <p className="empty__text">它可能已被删除，或链接已失效。</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
            <ArrowLeft size={14} /> 回到书架
          </button>
        </div>
      </div>
    );
  }

  const readerStyle = {
    '--content-width': `${settings.contentWidth}px`,
    '--reader-font': FONT_VAR[settings.fontFamily],
    '--reader-size': `${settings.fontSize}px`,
    '--reader-leading': String(settings.lineHeight),
    '--reader-columns': String(isMobile ? 1 : settings.columns),
  } as unknown as CSSProperties;

  return (
    <div className="reader-root" data-theme={settings.theme} style={readerStyle}>
      <ReaderToolbar
        article={article}
        progress={progress}
        settings={settings}
        onUpdate={updateSettings}
        onBack={() => navigate('/')}
        onToggleToc={() => setTocOpen(true)}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        onToggleNotes={() => setNotesOpen(true)}
        onMarkFinished={() => void markFinished()}
        onExport={(mode) => void exportMarkdown(mode)}
        failedCount={failedCount}
        notesCount={articleHighlights.length}
      />

      {settingsOpen && (
        <>
          <div className="popover-scrim" onClick={() => setSettingsOpen(false)} />
          <ReaderSettingsPanel
            settings={settings}
            update={updateSettings}
            reset={resetSettings}
            onClose={() => setSettingsOpen(false)}
          />
        </>
      )}

      <div className="reader-layout">
        <article className="reader-sheet">
          <header className="reader-sheet__head">
            <div className="reader-sheet__kicker">{article.siteName} · 藏书</div>
            <h1 className="reader-sheet__title">{article.title}</h1>
            <div className="reader-sheet__meta">
              <span>{formatDate(article.addedAt)} 收藏</span>
              <span>{article.wordCount} 字</span>
              <span>约 {formatMinutes(article.estReadMinutes)}</span>
              <a href={article.url} target="_blank" rel="noopener noreferrer">查看原文 ↗</a>
            </div>
          </header>

          {failedCount > 0 && (
            <div className="locate-warning" style={{ maxWidth: 'none' }}>
              有 {failedCount} 条划线未能在当前正文中定位（正文可能已变化）。为避免误标，已跳过这些划线。
            </div>
          )}

          <div
            ref={contentRef}
            className="reader-body"
            onClick={onContentClick}
            dangerouslySetInnerHTML={{ __html: prepared.html }}
          />

          <footer className="reader-sheet__meta" style={{ marginTop: 46, paddingTop: 20, borderTop: '1px solid var(--r-line)' }}>
            <span>— 全文完 —</span>
            <span>已读 {Math.round(progress * 100)}%</span>
          </footer>
        </article>

        {hasRail && !isMobile && (
          <MarginNotes
            mode="rail"
            highlights={articleHighlights}
            positions={notePositions}
            activeId={activeId}
            railRef={noteRailRef}
            onJump={jumpToHighlight}
            onSaveNote={(hid, note) => void saveNote(hid, note)}
            onDelete={(hid) => void deleteHighlight(hid)}
            onActivate={setActiveId}
          />
        )}
      </div>

      <ReadingRibbon progress={progress} mobile={isMobile} onSeek={seek} />

      {notesOpen && (!hasRail || isMobile) && (
        <MarginNotes
          mode="drawer"
          highlights={articleHighlights}
          positions={notePositions}
          activeId={activeId}
          onJump={jumpToHighlight}
          onSaveNote={(hid, note) => void saveNote(hid, note)}
          onDelete={(hid) => void deleteHighlight(hid)}
          onActivate={setActiveId}
          onClose={() => setNotesOpen(false)}
        />
      )}

      <TableOfContents open={tocOpen} toc={toc} mobile={isMobile} onJump={jumpToc} onClose={() => setTocOpen(false)} />

      {selection && (
        <SelectionMenu
          info={selection}
          mobile={isMobile}
          onHighlight={(color, withNote) => void createHighlight(color, withNote)}
          onCopy={() => void copySelection()}
          onDismiss={() => { clearSelection(); setSelection(null); }}
        />
      )}

      {isMobile && (
        <nav className="reader-bottom-bar" aria-label="阅读工具">
          <button type="button" onClick={() => setTocOpen(true)}><ListTree size={19} />目录</button>
          <button type="button" className={settingsOpen ? 'is-active' : ''} onClick={() => setSettingsOpen((v) => !v)}><Settings2 size={19} />排版</button>
          <button type="button" className={notesOpen ? 'is-active' : ''} onClick={() => setNotesOpen(true)}>
            <StickyNote size={19} />批注 {articleHighlights.length || ''}
          </button>
          <button type="button" onClick={() => setExportSheetOpen(true)}><FileDown size={19} />导出</button>
          <button type="button" onClick={() => void markFinished()}>
            <Check size={19} />{article.status === 'finished' ? '未读' : '读完'}
          </button>
        </nav>
      )}

      {exportSheetOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setExportSheetOpen(false)} />
          <section className="drawer drawer--bottom" role="dialog" aria-label="导出 Markdown">
            <div className="drawer__grip" />
            <div className="drawer__head">
              <h3>导出这篇文章的划线</h3>
              <button type="button" className="icon-btn" onClick={() => setExportSheetOpen(false)} aria-label="关闭"><X size={17} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="btn" onClick={() => void exportMarkdown('copy')}><Copy size={14} /> 复制 Markdown</button>
              <button type="button" className="btn" onClick={() => void exportMarkdown('download')}><FileDown size={14} /> 下载 .md 文件</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
