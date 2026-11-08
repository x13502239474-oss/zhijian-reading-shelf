import { X } from 'lucide-react';
import type { TocItem } from '../../types';

interface Props {
  open: boolean;
  toc: TocItem[];
  mobile: boolean;
  onJump: (id: string) => void;
  onClose: () => void;
}

export function TableOfContents({ open, toc, mobile, onJump, onClose }: Props) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className={`drawer ${mobile ? 'drawer--bottom' : 'drawer--left'}`} role="dialog" aria-label="文章目录">
        {mobile && <div className="drawer__grip" />}
        <div className="drawer__head">
          <h3>目录</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭目录"><X size={17} /></button>
        </div>
        {toc.length === 0 ? (
          <p className="hint">这篇文章没有可用的标题结构，可使用键盘 ← → 或书签丝带跳转阅读位置。</p>
        ) : (
          <nav className="toc-list">
            {toc.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`toc-item toc-item--l${Math.min(4, Math.max(1, item.level))}`}
                onClick={() => onJump(item.id)}
              >
                {item.text}
              </button>
            ))}
          </nav>
        )}
      </aside>
    </>
  );
}
