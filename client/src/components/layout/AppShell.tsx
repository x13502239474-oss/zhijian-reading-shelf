import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Highlighter, LibraryBig, Plus } from 'lucide-react';
import { useShelf } from '../../hooks/useShelf';

const NAV = [
  { to: '/', label: '书架', icon: LibraryBig, end: true },
  { to: '/add', label: '添加文章', icon: Plus, end: false },
  { to: '/highlights', label: '划线与批注', icon: Highlighter, end: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { articles, highlights } = useShelf();
  const counts: Record<string, number> = {
    '/': articles.length,
    '/add': 0,
    '/highlights': highlights.length,
  };

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="rail-brand">
          <div className="rail-brand__mark">
            <span className="rail-brand__seal">纸</span>
            纸间
          </div>
          <div className="rail-brand__sub">ZHIJIAN · 私人书房</div>
        </div>

        <nav className="rail-nav" aria-label="主导航">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.6} />
              <span>{label}</span>
              {counts[to] > 0 && <span className="rail-link__count">{counts[to]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="rail-foot">
          <p>
            <strong>本地优先</strong>
            <br />
            文章、进度与批注只保存在这台设备的浏览器里。
          </p>
        </div>
      </aside>

      <main className="app-main">{children}</main>

      <nav className="app-bottom-nav" aria-label="底部导航">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'is-active' : '')}
          >
            <Icon size={20} strokeWidth={1.6} />
            <span>{label === '划线与批注' ? '划线' : label === '添加文章' ? '添加' : label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
