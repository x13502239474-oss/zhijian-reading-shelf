import { SearchX } from 'lucide-react';
import type { Article } from '../../types';
import { ArticleRow } from './ArticleRow';

interface ArticleListViewProps {
  articles: Article[];
  onOpen: (id: string) => void;
  onStatus: (id: string, status: Article['status']) => void;
  onDelete: (article: Article) => void;
  onExport: (article: Article) => void;
}

export function ArticleListView({ articles, onOpen, onStatus, onDelete, onExport }: ArticleListViewProps) {
  return (
    <div className="list-wrap">
      {articles.length === 0 ? (
        <div className="empty">
          <SearchX className="empty__icon" size={30} strokeWidth={1.2} />
          <div className="empty__title">没有匹配的文章</div>
          <p className="empty__text">试试更换筛选条件或搜索关键词。</p>
        </div>
      ) : (
        <>
          <div className="list-head">
            <span>标题 / 状态</span>
            <span>来源</span>
            <span>阅读状态</span>
            <span>时长 / 收藏</span>
            <span style={{ textAlign: 'right' }}>操作</span>
          </div>
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              onOpen={onOpen}
              onStatus={onStatus}
              onDelete={onDelete}
              onExport={onExport}
            />
          ))}
          <p className="hint" style={{ marginTop: 16 }}>共 {articles.length} 篇文章。</p>
        </>
      )}
    </div>
  );
}
