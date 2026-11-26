import { Html } from '@react-three/drei';
import { useRef } from 'react';
import { useTimelineFrame } from '../time';
import type { Vec3 } from '../camera';

/**
 * "Richtig gemacht" series: small white 3D tag that sits on the object (pill with a pointer),
 * pops in with a slight tilt. Deterministic in t.
 */
export function Tag({ position, text, visible, tone = 'info', tilt = -3 }: { position: Vec3; text: string; visible: (t: number) => number; tone?: 'info' | 'bad' | 'good'; tilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useTimelineFrame((t) => {
    const el = ref.current;
    if (!el) return;
    const v = visible(t);
    el.style.display = v < 0.005 ? 'none' : 'block';
    const pop = v < 1 ? 0.6 + 0.4 * v + 0.12 * Math.sin(v * Math.PI) : 1;
    el.style.opacity = String(Math.min(1, v * 1.5));
    el.style.transform = `translate(-50%, -100%) rotate(${tilt}deg) scale(${pop})`;
  });
  return (
    <Html position={position as [number, number, number]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className={`rg-tag rg-${tone}`} style={{ display: 'none' }}>
        {tone === 'bad' && <span className="rg-tag-ico">✕</span>}
        {tone === 'good' && <span className="rg-tag-ico">✓</span>}
        {text}
        <div className="rg-tag-ptr" />
      </div>
    </Html>
  );
}
