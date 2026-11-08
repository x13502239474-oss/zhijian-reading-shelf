import { X } from 'lucide-react';
import type { ReadingSettings } from '../../types';

interface Props {
  settings: ReadingSettings;
  update: (patch: Partial<ReadingSettings>) => void;
  reset: () => void;
  onClose: () => void;
}

const FONTS: { key: ReadingSettings['fontFamily']; label: string }[] = [
  { key: 'serif', label: '宋体衬线' },
  { key: 'song', label: '传统宋体' },
  { key: 'sans', label: '无衬线' },
];

export function ReaderSettingsPanel({ settings, update, reset, onClose }: Props) {
  return (
    <div className="settings-pop" role="dialog" aria-label="阅读排版设置">
      <div className="drawer__head" style={{ marginBottom: 16 }}>
        <h3>阅读排版</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭排版设置">
          <X size={17} />
        </button>
      </div>

      <div className="settings-pop__row">
        <div className="settings-pop__label">
          <span>正文字号</span><span>{settings.fontSize} px</span>
        </div>
        <input
          type="range" min={15} max={28} step={1}
          value={settings.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          aria-label="正文字号"
        />
      </div>

      <div className="settings-pop__row">
        <div className="settings-pop__label">
          <span>行距</span><span>{settings.lineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range" min={1.5} max={2.4} step={0.1}
          value={settings.lineHeight}
          onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          aria-label="行距"
        />
      </div>

      <div className="settings-pop__row">
        <div className="settings-pop__label">
          <span>内容宽度</span><span>{settings.contentWidth} px</span>
        </div>
        <input
          type="range" min={560} max={980} step={20}
          value={settings.contentWidth}
          onChange={(e) => update({ contentWidth: Number(e.target.value) })}
          aria-label="内容宽度"
        />
      </div>

      <div className="settings-pop__row">
        <div className="settings-pop__label"><span>正文字体</span></div>
        <div className="settings-pop__options">
          {FONTS.map((font) => (
            <button
              key={font.key}
              type="button"
              className={`chip${settings.fontFamily === font.key ? ' chip--active' : ''}`}
              onClick={() => update({ fontFamily: font.key })}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-pop__row">
        <div className="settings-pop__label"><span>分栏</span></div>
        <div className="settings-pop__options">
          <button type="button" className={`chip${settings.columns === 1 ? ' chip--active' : ''}`} onClick={() => update({ columns: 1 })}>单栏</button>
          <button type="button" className={`chip${settings.columns === 2 ? ' chip--active' : ''}`} onClick={() => update({ columns: 2 })}>双栏</button>
        </div>
      </div>

      <button type="button" className="btn btn--quiet btn--sm" onClick={reset}>恢复默认排版</button>
    </div>
  );
}
