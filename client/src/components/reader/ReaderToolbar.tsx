import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Copy, FileDown, Highlighter, ListTree, Settings2, X,
} from 'lucide-react';
import type { Article, ReadingSettings } from '../../types';
import { formatMinutes } from '../../lib/format';
import { ThemePicker } from './ThemePicker';

interface Props {
  article: Article;
  progress: number;
  settings: ReadingSettings;
  onUpdate: (patch: Partial<ReadingSettings>) => void;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleSettings: () => void;
  onToggleNotes: () => void;
  onMarkFinished: () => void;
  onExport: (mode: 'copy' | 'download') => void;
  failedCount: number;
  notesCount: number;
}

export function ReaderToolbar({
  article, progress, settings, onUpdate, onBack, onToggleToc, onToggleSettings,
  onToggleNotes, onMarkFinished, onExport, failedCount, notesCount,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const pct = Math.round(progress * 100);

  return (
    <header className="reader-toolbar">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="返回书架" title="返回书架">
        <ArrowLeft size={18} />
      </button>
      <span className="reader-toolbar__title" title={article.title}>{article.title}</span>
      <span className="reader-toolbar__meta">{pct}% · {formatMinutes(article.estReadMinutes)}</span>

      <span className="reader-toolbar__spacer" />

      <ThemePicker value={settings.theme} onChange={(theme) => onUpdate({ theme })} />

      <div className="reader-toolbar__group reader-toolbar__group--desktop">
        <button type="button" className="icon-btn" onClick={onToggleSettings} aria-label="阅读排版" title="阅读排版">
          <Settings2 size={17} />
        </button>
        <button type="button" className="icon-btn" onClick={onToggleToc} aria-label="文章目录" title="文章目录">
          <ListTree size={17} />
        </button>
        <button type="button" className="icon-btn" onClick={onToggleNotes} aria-label="页边批注" title="页边批注">
          <Highlighter size={17} />
          {notesCount > 0 && <span style={{ fontSize: 9, marginLeft: 2 }}>{notesCount}</span>}
        </button>

        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`icon-btn${exportOpen ? ' icon-btn--active' : ''}`}
            onClick={() => setExportOpen((v) => !v)}
            aria-label="导出 Markdown"
            title="导出 Markdown"
            aria-expanded={exportOpen}
          >
            <FileDown size={17} />
          </button>
          {exportOpen && (
            <div className="toolbar-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { onExport('copy'); setExportOpen(false); }}>
                <Copy size={14} /> 复制 Markdown
              </button>
              <button type="button" role="menuitem" onClick={() => { onExport('download'); setExportOpen(false); }}>
                <FileDown size={14} /> 下载 .md 文件
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`btn btn--sm${article.status === 'finished' ? '' : ' btn--brass'}`}
          onClick={onMarkFinished}
        >
          {article.status === 'finished' ? <X size={13} /> : <Check size={13} />}
          {article.status === 'finished' ? '标为未读' : '标为已读'}
        </button>
      </div>

      {failedCount > 0 && (
        <span className="reader-toolbar__meta" style={{ color: '#9c4b40' }}>
          {failedCount} 条划线定位失败
        </span>
      )}
    </header>
  );
}
