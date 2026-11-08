import { useEffect, useRef, useState } from 'react';
import {
  Archive, Check, ExternalLink, FileDown, MoreHorizontal, RotateCcw, Trash2,
} from 'lucide-react';
import type { Article } from '../../types';
import { formatDate, formatMinutes, spineColorFor } from '../../lib/format';
import { StatusBadge } from './StatusBadge';

interface ArticleRowProps {
  article: Article;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: Article['status']) => void;
  onDelete: (article: Article) => void;
  onExport: (article: Article) => void;
}

export function ArticleRow({ article, onOpen, onStatus, onDelete, onExport }: ArticleRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const status = article.status;
  const nextStatus = status === 'finished' ? 'unread' : 'finished';

  return (
    <div className="article-row">
      <div className="article-row__main">
        <span className="article-row__bar" style={{ backgroundColor: spineColorFor(article) }} />
        <div style={{ minWidth: 0 }}>
          <button type="button" className="article-row__title" onClick={() => onOpen(article.id)}>
            {article.title}
          </button>
          <div className="article-row__sub">
            <span>{article.siteName}</span>
            <span>{formatMinutes(article.estReadMinutes)}</span>
            <span>{article.wordCount} 字</span>
            <span>{status === 'finished' ? '已完成' : `已读 ${Math.round((article.progress || 0) * 100)}%`}</span>
          </div>
        </div>
      </div>

      <span className="article-row__cell" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {article.siteName}
      </span>
      <div><StatusBadge status={status} /></div>
      <span className="article-row__cell">
        {formatMinutes(article.estReadMinutes)}<br />
        <span style={{ fontSize: 11 }}>{formatDate(article.addedAt)} 收藏</span>
      </span>

      <div className="article-row__actions" ref={ref} style={{ position: 'relative' }}>
        <a
          className="icon-btn"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="打开原网页"
          title="打开原网页"
        >
          <ExternalLink size={15} />
        </a>
        <button
          type="button"
          className={`icon-btn${menuOpen ? ' icon-btn--active' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="更多操作"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={17} />
        </button>

        {menuOpen && (
          <div className="row-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { onStatus(article.id, nextStatus); setMenuOpen(false); }}>
              {status === 'finished' ? <RotateCcw size={14} /> : <Check size={14} />}
              {status === 'finished' ? '标记为未读' : '标记为已完成'}
            </button>
            <button type="button" role="menuitem" onClick={() => { onStatus(article.id, 'archived'); setMenuOpen(false); }}>
              <Archive size={14} /> 归档
            </button>
            <button type="button" role="menuitem" onClick={() => { onExport(article); setMenuOpen(false); }}>
              <FileDown size={14} /> 导出 Markdown
            </button>
            <button type="button" role="menuitem" className="is-danger" onClick={() => { onDelete(article); setMenuOpen(false); }}>
              <Trash2 size={14} /> 删除文章
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
