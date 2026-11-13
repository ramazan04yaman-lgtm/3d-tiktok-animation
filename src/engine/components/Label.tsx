import { Html } from '@react-three/drei';
import { useRef } from 'react';
import { useTimelineFrame } from '../time';
import type { Vec3 } from '../camera';

export interface LabelProps {
  position: Vec3;
  text: string;
  sub?: string;
  visible: (t: number) => number;
  /** offset of the text box from the anchor in px (screen space) */
  offset?: [number, number];
  accent?: string;
}

/** Technical callout: anchor dot in 3D, leader line and text box in screen space. */
export function Label({ position, text, sub, visible, offset = [140, -90], accent = '#58c4ff' }: LabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTimelineFrame((t) => {
    const el = ref.current;
    if (!el) return;
    const v = visible(t);
    el.style.opacity = String(v);
    el.style.display = v < 0.005 ? 'none' : 'block';
    el.style.setProperty('--grow', String(Math.min(1, v * 1.4)));
  });
  const [dx, dy] = offset;
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <Html position={position as [number, number, number]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className="mx-label" style={{ display: 'none', ['--accent' as string]: accent }}>
        <div className="mx-label-dot" />
        <div className="mx-label-line" style={{ width: len, transform: `rotate(${ang}deg) scaleX(var(--grow))` }} />
        <div className="mx-label-box" style={{ left: dx, top: dy, transform: `translate(${dx < 0 ? '-100%' : '0'}, -50%)` }}>
          <div className="mx-label-title">{text}</div>
          {sub && <div className="mx-label-sub">{sub}</div>}
        </div>
      </div>
    </Html>
  );
}
