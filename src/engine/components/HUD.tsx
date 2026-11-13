import type { ReactNode } from 'react';
import { envelope, ramp } from '../math';
import { useTime } from '../time';

/**
 * Series-standard measurement bar (identical look to the kettle episode):
 * big value, gradient bar with scale, meta lines on the right.
 */
export function MeterHUD({ visible, value, unit, fill, color, scale, meta }: {
  visible: number;
  value: string;
  unit: string;
  fill: number;
  color: string;
  scale: string[];
  meta: ReactNode;
}) {
  if (visible <= 0.001) return null;
  return (
    <div className="mx-hud" style={{ opacity: visible, transform: `translateY(${(1 - visible) * -20}px)` }}>
      <div className="mx-hud-value" style={{ color }}>
        {value}
        <span>{unit}</span>
      </div>
      <div className="mx-hud-barwrap">
        <div className="mx-hud-bar">
          <div className="mx-hud-fill" style={{ width: `${Math.max(3, fill * 100)}%`, background: `linear-gradient(90deg, #1f4fff, ${color})` }} />
        </div>
        <div className="mx-hud-scale">
          {scale.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
      <div className="mx-hud-meta">{meta}</div>
    </div>
  );
}

/** Series-standard intro title ("SO FUNKTIONIERT'S" + big name). */
export function IntroTitle({ kicker = "SO FUNKTIONIERT'S", title, inAt = 0.3, outAt = 4.2 }: { kicker?: string; title: string; inAt?: number; outAt?: number }) {
  const t = useTime((s) => s.time);
  const v = envelope(t, inAt, inAt + 0.9, outAt, outAt + 0.8);
  if (v <= 0.001) return null;
  return (
    <div className="mx-intro" style={{ opacity: v, transform: `translateY(${(1 - ramp(t, inAt, inAt + 1.1)) * 30}px)` }}>
      <div className="mx-intro-kicker">{kicker}</div>
      <div className="mx-intro-title">{title}</div>
    </div>
  );
}
