import { useMemo, useState } from 'react';
import {
  BookMarked, ChevronDown, ChevronUp, Copy, Download, ExternalLink,
  Pencil, Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastProvider';
import { useShelf } from '../hooks/useShelf';
import { formatDateTime } from '../lib/format';
import { buildMarkdown, copyText, downloadMarkdown } from '../lib/markdown';
import type { Article, Highlight } from '../types';

type SortOrder = 'newest' | 'oldest';

export default function HighlightsPage() {
  const { articles, highlights, updateHighlight, removeHighlight } = useShelf();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [articleFilter, setArticleFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Highlight | null>(null);
  const [exportScope, setExportScope] = useState<string>('all');

  const articleMap = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const articlesWithHighlights = useMemo(() => {
    const ids = new Set(highlights.map((h) => h.articleId));
    return articles.filter((a) => ids.has(a.id)).sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  }, [articles, highlights]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of highlights) map.set(h.articleId, (map.get(h.articleId) || 0) + 1);
    return map;
  }, [highlights]);

  const visible = useMemo(() => {
    const list = highlights.filter((h) => articleFilter === 'all' || h.articleId === articleFilter);
    list.sort((a, b) => (sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    return list;
  }, [highlights, articleFilter, sortOrder]);

  const allExpanded = visible.length > 0 && visible.every((h) => expanded.has(h.id));
  const toggleAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(visible.map((h) => h.id)));
  };
  const toggleOne = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (h: Highlight) => {
    setEditingId(h.id);
    setDraft(h.note || '');
  };
  const saveEdit = async () => {
    if (!editingId) return;
    await updateHighlight(editingId, { note: draft.trim() });
    setEditingId(null);
    toast('批注已保存', 'success');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await removeHighlight(deleteTarget.id);
    toast('划线已删除', 'success');
    setDeleteTarget(null);
  };

  const jumpTo = (h: Highlight) => {
    if (!articleMap.has(h.articleId)) {
      toast('所属文章已不存在', 'error');
      return;
    }
    navigate(`/read/${h.articleId}?highlight=${encodeURIComponent(h.id)}`);
  };

  const exportScopeArticles: Article[] = exportScope === 'all'
    ? articles
    : articles.filter((a) => a.id === exportScope);
  const exportCount = highlights.filter((h) => exportScopeArticles.some((a) => a.id === h.articleId)).length;

  const doExport = async (mode: 'copy' | 'download') => {
    const md = buildMarkdown(exportScopeArticles, highlights);
    if (!md) {
      toast('所选范围没有划线可导出', 'info');
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
      const name = exportScope === 'all'
        ? '纸间-全部划线与批注'
        : `${articleMap.get(exportScope)?.title || '文章'}-划线与批注`;
      downloadMarkdown(name, md);
      toast('Markdown 已下载', 'success');
    }
  };

  return (
    <AppShell>
      <div className="page">
        <header className="page-head">
          <div>
            <div className="eyebrow">MARGINALIA</div>
            <h1 className="page-title">划线与批注</h1>
            <p className="page-sub">夹在书页里的私人书签，按文章重读、编辑与导出。</p>
          </div>
          <div className="page-actions">
            <button type="button" className="btn" onClick={() => void doExport('copy')}><Copy size={14} /> 复制全部</button>
            <button type="button" className="btn btn--primary" onClick={() => void doExport('download')}><Download size={14} /> 下载 Markdown</button>
          </div>
        </header>

        <div className="export-bar">
          <span className="export-bar__text">
            导出范围：{exportScope === 'all' ? '全部文章' : articleMap.get(exportScope)?.title || '指定文章'} · 共 {exportCount} 条划线（含无批注的划线）
          </span>
          <select className="select" style={{ width: 'auto', minWidth: 190 }} value={exportScope} onChange={(e) => setExportScope(e.target.value)} aria-label="导出范围">
            <option value="all">全部文章</option>
            {articlesWithHighlights.map((a) => (
              <option key={a.id} value={a.id}>{a.title.slice(0, 28)}</option>
            ))}
          </select>
          <button type="button" className="btn btn--sm" onClick={() => void doExport('copy')}><Copy size={13} /> 复制</button>
          <button type="button" className="btn btn--sm" onClick={() => void doExport('download')}><Download size={13} /> 下载</button>
        </div>

        <div className="hl-layout">
          <aside className="hl-side">
            <h2 className="hl-side__title">按文章筛选</h2>
            <div className="hl-side__list">
              <button type="button" className={`hl-side__item${articleFilter === 'all' ? ' is-active' : ''}`} onClick={() => setArticleFilter('all')}>
                全部文章 <span className="hl-side__count">{highlights.length}</span>
              </button>
              {articlesWithHighlights.map((a) => (
                <button key={a.id} type="button" className={`hl-side__item${articleFilter === a.id ? ' is-active' : ''}`} onClick={() => setArticleFilter(a.id)} title={a.title}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  <span className="hl-side__count">{counts.get(a.id) || 0}</span>
                </button>
              ))}
            </div>
          </aside>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="hint" style={{ marginRight: 'auto' }}>共 {visible.length} 条划线</span>
              <select className="select" style={{ width: 'auto', minWidth: 130 }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} aria-label="排序方式">
                <option value="newest">最新创建在前</option>
                <option value="oldest">最早创建在前</option>
              </select>
              <button type="button" className="btn btn--sm" onClick={toggleAll}>
                {allExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {allExpanded ? '全部收起' : '全部展开'}
              </button>
            </div>

            {visible.length === 0 ? (
              <div className="empty">
                <BookMarked className="empty__icon" size={32} strokeWidth={1.2} />
                <div className="empty__title">这里还没有书签</div>
                <p className="empty__text">打开一篇文章，选中喜欢的句子，就可以划线或写下批注。</p>
                <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>去书架看看</button>
              </div>
            ) : (
              visible.map((h) => {
                const article = articleMap.get(h.articleId);
                const isExpanded = expanded.has(h.id);
                const isEditing = editingId === h.id;
                return (
                  <article className="hl-card" key={h.id}>
                    <div className="hl-card__head">
                      <button type="button" className="hl-card__article" onClick={() => article && navigate(`/read/${article.id}`)} title={article?.title}>
                        {article?.title || '已删除的文章'}
                      </button>
                      <span className="hl-card__time">{formatDateTime(h.createdAt)}</span>
                    </div>

                    <div className={`hl-card__quote${isExpanded ? '' : ' hl-card__quote--collapsed'}`}>{h.text}</div>

                    {isEditing ? (
                      <div style={{ marginTop: 12 }}>
                        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="写下你的想法…" autoFocus />
                        <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                          <button type="button" className="btn btn--sm btn--brass" onClick={() => void saveEdit()}>保存批注</button>
                          <button type="button" className="btn btn--sm" onClick={() => setEditingId(null)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`hl-card__note${isExpanded ? '' : ' hl-card__note--collapsed'}`} style={{ color: h.note ? 'inherit' : 'var(--ink-faint)' }}>
                        {h.note ? `批注：${h.note}` : '（无批注）'}
                      </div>
                    )}

                    <div className="hl-card__foot">
                      <button type="button" className="btn btn--sm btn--quiet" onClick={() => toggleOne(h.id)}>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isExpanded ? '收起' : '展开'}
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => startEdit(h)}><Pencil size={13} /> 编辑批注</button>
                      <button type="button" className="btn btn--sm" onClick={() => jumpTo(h)}><ExternalLink size={13} /> 回到原文</button>
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => setDeleteTarget(h)}><Trash2 size={13} /> 删除</button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>

      <Dialog
        open={!!deleteTarget}
        title="删除这条划线？"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>取消</button>
            <button type="button" className="btn btn--danger" onClick={() => void confirmDelete()}>确认删除</button>
          </>
        }
      >
        <p style={{ fontSize: 13, lineHeight: 1.8 }}>「{deleteTarget?.text.slice(0, 60)}…」及其批注将被永久删除。</p>
      </Dialog>
    </AppShell>
  );
}
