import { useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Bookshelf } from '../components/shelf/Bookshelf';
import { ShelfStats } from '../components/shelf/ShelfStats';
import { ArticleListView } from '../components/article/ArticleListView';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastProvider';
import { useShelf } from '../hooks/useShelf';
import { useIsMobile } from '../hooks/useMediaQuery';
import { buildMarkdown, downloadMarkdown } from '../lib/markdown';
import { SPINE_PALETTE, spineColorFor } from '../lib/format';
import {
  FILTER_LABEL, SORT_LABEL,
  type Article, type ShelfFilter, type ShelfSort, type ShelfView,
} from '../types';

const VIEW_KEY = 'zhijian.shelf.view.v1';
const FILTERS: ShelfFilter[] = ['all', 'unread', 'reading', 'finished', 'archived'];
const SORTS: ShelfSort[] = ['addedAt', 'lastReadAt', 'estReadMinutes', 'title'];

export default function ShelfPage() {
  const { articles, highlights, loading, error, updateArticle, removeArticle } = useShelf();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [view, setView] = useState<ShelfView>(() =>
    localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'shelf'
  );
  const [filter, setFilter] = useState<ShelfFilter>('all');
  const [sort, setSort] = useState<ShelfSort>('addedAt');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  const changeView = (next: ShelfView) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* 忽略 */ }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = articles.filter((article) => {
      if (filter !== 'all' && article.status !== filter) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.siteName.toLowerCase().includes(q) ||
        article.url.toLowerCase().includes(q) ||
        (article.contentText || '').toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      switch (sort) {
        case 'lastReadAt': return (b.lastReadAt || 0) - (a.lastReadAt || 0) || b.addedAt - a.addedAt;
        case 'estReadMinutes': return b.estReadMinutes - a.estReadMinutes || b.addedAt - a.addedAt;
        case 'title': return a.title.localeCompare(b.title, 'zh-Hans-CN');
        default: return b.addedAt - a.addedAt;
      }
    });
    return list;
  }, [articles, filter, sort, query]);

  const legend = useMemo(() => {
    const map = new Map<string, string>();
    for (const article of visible) {
      const key = article.siteName || '未知来源';
      if (!map.has(key)) map.set(key, spineColorFor(article));
    }
    return Array.from(map.entries()).slice(0, 7);
  }, [visible]);

  const handleExport = (article: Article) => {
    const md = buildMarkdown([article], highlights.filter((h) => h.articleId === article.id));
    if (!md) {
      toast('这篇文章还没有划线，暂无内容可导出', 'info');
      return;
    }
    downloadMarkdown(`${article.title}-划线与批注`, md);
    toast('Markdown 已下载', 'success');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeArticle(deleteTarget.id);
    toast('文章及其划线已删除', 'success');
    setDeleteTarget(null);
  };

  return (
    <AppShell>
      <div className="shelf-page">
        <header className="shelf-hero">
          <div className="shelf-hero__top">
            <div>
              <div className="eyebrow">MY PRIVATE LIBRARY</div>
              <h1>纸间 · 私人书架</h1>
              <p className="shelf-hero__quote">收藏的文章立在这里，像一排读过的和未读的书。</p>
            </div>
            <div className="page-actions">
              <div className="seg" role="group" aria-label="视图切换">
                <button type="button" className={view === 'shelf' ? 'is-active' : ''} onClick={() => changeView('shelf')}>
                  <LayoutGrid size={14} /> 书架
                </button>
                <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => changeView('list')}>
                  <List size={14} /> 列表
                </button>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/add')}>
                <Plus size={15} /> 添加文章
              </button>
            </div>
          </div>
          <ShelfStats articles={articles} />
        </header>

        {error && <div className="locate-warning" style={{ margin: '0 44px 16px' }}>{error}</div>}

        <div className="shelf-toolbar">
          <div className="shelf-toolbar__search">
            <Search size={15} />
            <input
              className="input"
              type="search"
              placeholder="搜索标题、来源、网址或正文…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索文章"
            />
          </div>
          <div className="shelf-toolbar__filters">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip${filter === item ? ' chip--active' : ''}`}
                onClick={() => setFilter(item)}
              >
                {FILTER_LABEL[item]}
              </button>
            ))}
          </div>
          <div className="shelf-toolbar__right">
            <SlidersHorizontal size={14} color="#9a9082" aria-hidden="true" />
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value as ShelfSort)}
              aria-label="排序方式"
            >
              {SORTS.map((item) => (
                <option key={item} value={item}>{SORT_LABEL[item]}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty"><p className="empty__text">正在打开本地书房…</p></div>
        ) : view === 'shelf' ? (
          <>
            <Bookshelf articles={visible} mobile={isMobile} onOpen={(id) => navigate(`/read/${id}`)} />
            <div className="shelf-legend">
              <span>书脊颜色按来源区分 · 宽度对应预计阅读时长</span>
              {legend.map(([name, color]) => (
                <span className="shelf-legend__item" key={name}>
                  <span className="shelf-legend__swatch" style={{ backgroundColor: color }} />
                  {name}
                </span>
              ))}
              {legend.length === 0 && <span>暂无收藏</span>}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
                {SPINE_PALETTE.slice(0, 3).map((c) => (
                  <span key={c.value} className="shelf-legend__item">
                    <span className="shelf-legend__swatch" style={{ backgroundColor: c.value }} />
                  </span>
                ))}
              </span>
            </div>
          </>
        ) : (
          <ArticleListView
            articles={visible}
            onOpen={(id) => navigate(`/read/${id}`)}
            onStatus={(id, status) => void updateArticle(id, { status })}
            onDelete={setDeleteTarget}
            onExport={handleExport}
          />
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        title="删除这篇文章？"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>取消</button>
            <button type="button" className="btn btn--danger" onClick={() => void handleDelete()}>确认删除</button>
          </>
        }
      >
        <p style={{ fontSize: 13, lineHeight: 1.8 }}>
          「{deleteTarget?.title}」以及它下面的所有划线和批注都会从本地数据库中移除，此操作不可撤销。
        </p>
      </Dialog>
    </AppShell>
  );
}
