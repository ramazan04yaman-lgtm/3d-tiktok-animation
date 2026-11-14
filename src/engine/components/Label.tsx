import { Html } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VIDEO } from '../config';
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
  /** keep the text box inside the safe zone (below chip/HUD, above captions, inside the frame) */
  safe?: boolean;
}

/** Safe zone for callout boxes on the 1080×1920 stage (chip + HUD at the top, captions at the bottom). */
export const LABEL_SAFE = { left: 24, right: VIDEO.width - 30, top: 392, bottom: 1180 };

/** Technical callout: anchor dot in 3D, leader line and text box in screen space. */
export function Label({ position, text, sub, visible, offset = [140, -90], accent = '#58c4ff', safe = true }: LabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const [dx, dy] = offset;

  useTimelineFrame((t, state) => {
    const el = ref.current;
    if (!el) return;
    const v = visible(t);
    el.style.opacity = String(v);
    el.style.display = v < 0.005 ? 'none' : 'block';
    el.style.setProperty('--grow', String(Math.min(1, v * 1.4)));
    const box = boxRef.current;
    const line = lineRef.current;
    if (!box || !line || v < 0.005) return;
    // desired box rectangle relative to the anchor
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    let left = dx < 0 ? dx - w : dx;
    let top = dy - h / 2;
    if (safe) {
      state.camera.updateMatrixWorld();
      anchor.set(position[0], position[1], position[2]).project(state.camera);
      const ax = ((anchor.x + 1) / 2) * VIDEO.width;
      const ay = ((1 - anchor.y) / 2) * VIDEO.height;
      const L = LABEL_SAFE;
      left = Math.min(Math.max(ax + left, L.left), L.right - w) - ax;
      top = Math.min(Math.max(ay + top, L.top), L.bottom - h) - ay;
    }
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    // leader line to the nearest point of the box
    const tx = Math.min(Math.max(0, left), left + w);
    const ty = Math.min(Math.max(0, top), top + h);
    const cx = tx === 0 && left < 0 && left + w > 0 ? 0 : tx;
    const cy = ty === 0 && top < 0 && top + h > 0 ? top + h / 2 : ty;
    const len = Math.hypot(cx, cy);
    line.style.width = `${len}px`;
    line.style.transform = `rotate(${(Math.atan2(cy, cx) * 180) / Math.PI}deg) scaleX(var(--grow))`;
  });

  return (
    <Html position={position as [number, number, number]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className="mx-label" style={{ display: 'none', ['--accent' as string]: accent }}>
        <div className="mx-label-dot" />
        <div ref={lineRef} className="mx-label-line" />
        <div ref={boxRef} className="mx-label-box" style={{ left: dx, top: dy }}>
          <div className="mx-label-title">{text}</div>
          {sub && <div className="mx-label-sub">{sub}</div>}
        </div>
      </div>
    </Html>
  );
}
