import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { clamp } from '../../lib/format';

interface Props {
  progress: number; // 0 ~ 1
  mobile: boolean;
  onSeek: (progress: number) => void;
}

export function ReadingRibbon({ progress, mobile, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const percent = `${clamp(progress, 0, 1) * 100}%`;

  const seekFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = trackRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const value = mobile
      ? clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
      : clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    onSeek(value);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) seekFromPointer(event);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* 忽略 */ }
  };

  const handlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  if (mobile) {
    return (
      <div className="mobile-progress" ref={trackRef} {...handlers} role="slider"
        aria-label="阅读位置" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)} tabIndex={0}>
        <span className="mobile-progress__track" style={{ position: 'relative' }}>
          <span className="mobile-progress__fill" style={{ width: percent }} />
          <span className="mobile-progress__knob" style={{ left: percent }} />
        </span>
        <span className="mobile-progress__value">{Math.round(progress * 100)}%</span>
      </div>
    );
  }

  return (
    <div className="ribbon" ref={trackRef} {...handlers} role="slider"
      aria-label="书签丝带 / 阅读位置" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)} tabIndex={0}>
      <div className="ribbon__silk">
        <div className="ribbon__fill" style={{ height: percent }} />
      </div>
      <div className="ribbon__knob" style={{ top: `calc(${percent} - 8px)` }} />
      <span className="ribbon__pct">{Math.round(progress * 100)}%</span>
    </div>
  );
}
