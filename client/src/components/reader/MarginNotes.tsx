import { useEffect, useState, type RefObject } from 'react';
import { ArrowUpRight, Pencil, Trash2, X } from 'lucide-react';
import type { Highlight } from '../../types';
import { formatDateTime } from '../../lib/format';

interface Props {
  mode: 'rail' | 'drawer';
  highlights: Highlight[];
  positions: { id: string; top: number }[];
  activeId: string | null;
  railRef?: RefObject<HTMLDivElement>;
  onJump: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onClose?: () => void;
}

interface CardProps {
  highlight: Highlight;
  active: boolean;
  onJump: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
}

function NoteCard({ highlight, active, onJump, onSaveNote, onDelete, onActivate }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(highlight.note || '');

  useEffect(() => {
    if (!editing) setDraft(highlight.note || '');
  }, [highlight.note, editing]);

  const save = () => {
    onSaveNote(highlight.id, draft.trim());
    setEditing(false);
  };

  return (
    <div
      className={active ? 'note-card is-active' : 'note-card'}
      onClick={() => { onActivate(highlight.id); onJump(highlight.id); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate(highlight.id);
          onJump(highlight.id);
        }
      }}
    >
      <div className="note-card__quote">{highlight.text}</div>
      {editing ? (
        <>
          <textarea
            value={draft}
            placeholder="写下你此刻的想法…"
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="note-card__foot" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn btn--sm btn--brass" onClick={save}>保存批注</button>
            <button type="button" className="btn btn--sm" onClick={() => setEditing(false)}>取消</button>
          </div>
        </>
      ) : (
        <>
          <div className={`note-card__note${highlight.note ? '' : ' note-card__note--empty'}`}>
            {highlight.note || '还没有批注，点这里写下想法'}
          </div>
          <div className="note-card__foot" onClick={(e) => e.stopPropagation()}>
            <span className="note-card__time">{formatDateTime(highlight.createdAt)}</span>
            <button type="button" className="icon-btn" title="编辑批注" aria-label="编辑批注" onClick={() => { onActivate(highlight.id); setEditing(true); }}>
              <Pencil size={13} />
            </button>
            <button type="button" className="icon-btn" title="定位原文" aria-label="定位原文" onClick={() => onJump(highlight.id)}>
              <ArrowUpRight size={13} />
            </button>
            <button type="button" className="icon-btn" title="删除划线" aria-label="删除划线" onClick={() => onDelete(highlight.id)}>
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function MarginNotes({
  mode, highlights, positions, activeId, railRef, onJump, onSaveNote, onDelete,
  onActivate, onClose,
}: Props) {
  const byId = new Map(highlights.map((h) => [h.id, h]));

  if (mode === 'rail') {
    return (
      <aside className="note-rail" ref={railRef} aria-label="页边批注">
        <div className="note-rail__label">页边批注 · {highlights.length}</div>
        {positions.map((pos) => {
          const highlight = byId.get(pos.id);
          if (!highlight) return null;
          return (
            <div key={pos.id} style={{ position: 'absolute', left: 0, right: 0, top: pos.top + 36 }}>
              <NoteCard
                highlight={highlight}
                active={activeId === highlight.id}
                onJump={onJump}
                onSaveNote={onSaveNote}
                onDelete={onDelete}
                onActivate={onActivate}
              />
            </div>
          );
        })}
      </aside>
    );
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <section className="drawer drawer--bottom" role="dialog" aria-label="划线与批注">
        <div className="drawer__grip" />
        <div className="drawer__head">
          <h3>划线与批注 · {highlights.length}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭批注"><X size={17} /></button>
        </div>
        {highlights.length === 0 ? (
          <p className="hint">选中正文中的一段文字，就可以划线或写下批注。</p>
        ) : (
          <div className="note-list">
            {highlights.map((highlight) => (
              <div className="note-list__card" key={highlight.id}>
                <div className="note-list__quote">{highlight.text}</div>
                <NoteCardBody
                  highlight={highlight}
                  onSaveNote={onSaveNote}
                  onDelete={onDelete}
                  onJump={onJump}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function NoteCardBody({
  highlight, onSaveNote, onDelete, onJump,
}: {
  highlight: Highlight;
  onSaveNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onJump: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(highlight.note || '');
  useEffect(() => { if (!editing) setDraft(highlight.note || ''); }, [highlight.note, editing]);

  if (editing) {
    return (
      <>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="写下你此刻的想法…" autoFocus />
        <div className="note-list__actions">
          <button type="button" className="btn btn--sm btn--brass" onClick={() => { onSaveNote(highlight.id, draft.trim()); setEditing(false); }}>保存</button>
          <button type="button" className="btn btn--sm" onClick={() => setEditing(false)}>取消</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="note-list__note" style={{ color: highlight.note ? 'inherit' : 'var(--r-ink-soft)' }}>
        {highlight.note || '点击编辑，写下批注'}
      </div>
      <div className="note-list__actions">
        <span className="note-list__time">{formatDateTime(highlight.createdAt)}</span>
        <button type="button" className="btn btn--sm" onClick={() => setEditing(true)}><Pencil size={12} /> 批注</button>
        <button type="button" className="btn btn--sm" onClick={() => onJump(highlight.id)}><ArrowUpRight size={12} /> 定位</button>
        <button type="button" className="btn btn--sm btn--danger" onClick={() => onDelete(highlight.id)}><Trash2 size={12} /> 删除</button>
      </div>
    </>
  );
}
