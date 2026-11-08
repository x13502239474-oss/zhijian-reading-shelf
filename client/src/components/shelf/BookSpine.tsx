import type { Article } from '../../types';
import { formatMinutes, statusLabel } from '../../lib/format';

interface BookSpineProps {
  article: Article;
  width: number;
  height: number;
  color: string;
  onOpen: (id: string) => void;
}

export function BookSpine({ article, width, height, color, onOpen }: BookSpineProps) {
  const status = statusLabel(article.status);
  return (
    <button
      type="button"
      className="spine"
      style={{ width, height, backgroundColor: color }}
      onClick={() => onOpen(article.id)}
      aria-label={`${article.title}，来自 ${article.siteName}，${status}，约 ${formatMinutes(article.estReadMinutes)}`}
    >
      <span className="spine__dot" aria-hidden="true" />
      <span className="spine__band" aria-hidden="true" />
      <span className="spine__title">{article.title}</span>
      <span className="spine__site">{article.siteName}</span>
      <span className="spine__band spine__band--bottom" aria-hidden="true" />
      <span className={`spine__status spine__status--${article.status}`}>{status}</span>

      <span className="spine__tip" role="tooltip">
        <span className="spine__tip-title">{article.title}</span>
        <span className="spine__tip-meta">
          <span>{article.siteName}</span>
          <span>·</span>
          <span>{formatMinutes(article.estReadMinutes)}</span>
          <span>·</span>
          <span>{status}</span>
        </span>
      </span>
    </button>
  );
}
