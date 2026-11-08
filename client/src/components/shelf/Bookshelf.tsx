import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Article } from '../../types';
import { spineColorFor, spineHeightFor, spineWidthFor } from '../../lib/format';
import { BookSpine } from './BookSpine';

interface BookshelfProps {
  articles: Article[];
  mobile: boolean;
  onOpen: (id: string) => void;
}

export function Bookshelf({ articles, mobile, onOpen }: BookshelfProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const node = measureRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => {
    if (articles.length === 0) return [];
    const gap = mobile ? 9 : 6;
    const usable = Math.max(220, width - 16);
    const result: Article[][] = [];
    let row: Article[] = [];
    let used = 0;
    for (const article of articles) {
      const w = spineWidthFor(article, mobile) + gap;
      if (mobile) {
        if (row.length >= 8) {
          result.push(row);
          row = [];
        }
        row.push(article);
      } else if (row.length > 0 && used + w > usable) {
        result.push(row);
        row = [article];
        used = w;
      } else {
        row.push(article);
        used += w;
      }
    }
    if (row.length > 0) result.push(row);
    return result;
  }, [articles, width, mobile]);

  const navigate = useNavigate();

  if (articles.length === 0) {
    return (
      <div className="shelf-wrap">
        <div className="shelf-inner" ref={measureRef}>
          <div className="empty" style={{ color: '#c6b59a' }}>
            <BookOpen className="empty__icon" size={34} strokeWidth={1.2} />
            <div className="empty__title" style={{ color: '#f2e7d1' }}>书架还空着</div>
            <p className="empty__text" style={{ color: '#a9967c' }}>
              收藏第一篇文章，它就会以书脊的样子立在这里。
            </p>
            <button type="button" className="btn btn--brass" onClick={() => navigate('/add')}>
              <Plus size={15} /> 添加文章
            </button>
          </div>
          <div className="shelf-plank" />
        </div>
      </div>
    );
  }

  return (
    <div className="shelf-wrap">
      <div className="shelf-inner" ref={measureRef}>
        {rows.map((row, index) => (
          <div className="shelf-row" key={`row-${index}`}>
            <div className="shelf-books">
              {row.map((article) => (
                <BookSpine
                  key={article.id}
                  article={article}
                  width={spineWidthFor(article, mobile)}
                  height={spineHeightFor(article, mobile)}
                  color={spineColorFor(article)}
                  onOpen={onOpen}
                />
              ))}
            </div>
            <div className="shelf-plank" />
          </div>
        ))}
      </div>
    </div>
  );
}
