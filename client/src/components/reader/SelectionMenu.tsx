import { useState } from 'react';
import { Copy, Highlighter, MessageSquarePlus, X } from 'lucide-react';
import type { SelectionInfo } from '../../lib/domHighlights';
import { clamp } from '../../lib/format';
import { HIGHLIGHT_COLOR_LABEL, type HighlightColor } from '../../types';

const COLORS: { key: HighlightColor; value: string }[] = [
  { key: 'sand', value: '#c7a664' },
  { key: 'sage', value: '#8ba382' },
  { key: 'rose', value: '#b7827e' },
  { key: 'mist', value: '#7898ac' },
];

interface Props {
  info: SelectionInfo;
  mobile: boolean;
  onHighlight: (color: HighlightColor, withNote: boolean) => void;
  onCopy: () => void;
  onDismiss: () => void;
}

export function SelectionMenu({ info, mobile, onHighlight, onCopy, onDismiss }: Props) {
  const [color, setColor] = useState<HighlightColor>('sand');

  const colorPicker = (
    <div className="hl-colors" role="group" aria-label="划线颜色">
      {COLORS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`hl-color${color === item.key ? ' is-active' : ''}`}
          style={{ backgroundColor: item.value }}
          title={HIGHLIGHT_COLOR_LABEL[item.key]}
          aria-label={HIGHLIGHT_COLOR_LABEL[item.key]}
          aria-pressed={color === item.key}
          onClick={() => setColor(item.key)}
        />
      ))}
    </div>
  );

  if (mobile) {
    return (
      <div className="selection-sheet" role="dialog" aria-label="选中文字操作" onMouseDown={(e) => e.preventDefault()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="eyebrow" style={{ flex: 1 }}>已选中文字</span>
          {colorPicker}
          <button type="button" className="icon-btn" onClick={onDismiss} aria-label="关闭"><X size={16} /></button>
        </div>
        <div className="selection-sheet__text">「{info.text.slice(0, 120)}」</div>
        <div className="selection-sheet__actions">
          <button type="button" className="btn btn--primary" onClick={() => onHighlight(color, false)}>
            <Highlighter size={14} /> 划线
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onHighlight(color, true)}>
            <MessageSquarePlus size={14} /> 加批注
          </button>
          <button type="button" className="btn" onClick={onCopy}><Copy size={14} /> 复制</button>
        </div>
      </div>
    );
  }

  const rect = info.rect;
  const left = rect ? clamp(rect.left + rect.width / 2, 180, window.innerWidth - 180) : window.innerWidth / 2;
  const top = rect ? (rect.top > 100 ? rect.top - 8 : rect.bottom + 46) : 120;

  return (
    <div className="selection-menu" style={{ left, top }} role="toolbar" aria-label="选中文字操作" onMouseDown={(e) => e.preventDefault()}>
      {colorPicker}
      <span className="selection-menu__divider" />
      <button type="button" onClick={() => onHighlight(color, false)}><Highlighter size={14} /> 划线</button>
      <button type="button" onClick={() => onHighlight(color, true)}><MessageSquarePlus size={14} /> 划线并批注</button>
      <button type="button" onClick={onCopy}><Copy size={14} /> 复制</button>
      <button type="button" onClick={onDismiss} aria-label="关闭"><X size={14} /></button>
    </div>
  );
}
