import type { Article } from '../../types';
import { formatMinutes, formatRelative } from '../../lib/format';

export function ShelfStats({ articles }: { articles: Article[] }) {
  const total = articles.length;
  const unread = articles.filter((a) => a.status === 'unread').length;
  const finished = articles.filter((a) => a.status === 'finished').length;
  const minutes = articles.reduce((sum, a) => sum + (a.estReadMinutes || 0), 0);
  const recentAdded = [...articles].sort((a, b) => b.addedAt - a.addedAt)[0];
  const recentRead = [...articles]
    .filter((a) => !!a.lastReadAt)
    .sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0];

  return (
    <div className="stats-strip">
      <div className="stat">
        <div className="stat__num">{total}</div>
        <div className="stat__label">收藏总数</div>
      </div>
      <div className="stat">
        <div className="stat__num">
          {unread}<small>篇待读</small>
        </div>
        <div className="stat__label">待读文章</div>
      </div>
      <div className="stat">
        <div className="stat__num">
          {finished}<small>篇已读</small>
        </div>
        <div className="stat__label">已完成</div>
      </div>
      <div className="stat">
        <div className="stat__num">
          {minutes}<small>分钟</small>
        </div>
        <div className="stat__label">总预计时长</div>
      </div>
      <div className="stat-recent">
        <div className="stat-recent__row">
          <span className="stat-recent__key">最近添加</span>
          <span className="stat-recent__val">
            {recentAdded ? `${recentAdded.title} · ${formatRelative(recentAdded.addedAt)}` : '—'}
          </span>
        </div>
        <div className="stat-recent__row">
          <span className="stat-recent__key">最近阅读</span>
          <span className="stat-recent__val">
            {recentRead
              ? `${recentRead.title} · ${formatRelative(recentRead.lastReadAt)} · 约 ${formatMinutes(recentRead.estReadMinutes)}`
              : '还没有开始阅读'}
          </span>
        </div>
      </div>
    </div>
  );
}
