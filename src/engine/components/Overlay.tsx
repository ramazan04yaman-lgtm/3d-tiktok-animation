import { envelope } from '../math';
import { useTime } from '../time';
import type { Timeline } from '../timeline';

/** Large TikTok-style caption, positioned inside the 9:16 safe zone. */
export function Captions({ timeline, skip }: { timeline: Timeline; skip?: (t: number) => boolean }) {
  const t = useTime((s) => s.time);
  if (skip?.(t)) return null;
  const c = timeline.captionAt(t);
  if (!c) return null;
  const v = envelope(t, c.start, c.start + 0.35, c.end - 0.3, c.end);
  return (
    <div className="mx-caption" style={{ opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
      <div className="mx-caption-text">{c.text}</div>
      {c.sub && <div className="mx-caption-sub">{c.sub}</div>}
    </div>
  );
}

/** "03 / 08 · Scene title" chip at the top. */
export function SceneChip({ timeline, hideBefore = 0 }: { timeline: Timeline; hideBefore?: number }) {
  const t = useTime((s) => s.time);
  if (t < hideBefore) return null;
  const s = timeline.sceneAt(t);
  const i = timeline.scenes.indexOf(s);
  const v = envelope(t, s.start, s.start + 0.4, s.end - 0.25, s.end + (i === timeline.scenes.length - 1 ? 1 : 0));
  return (
    <div className="mx-chip" style={{ opacity: v }}>
      <span className="mx-chip-num">
        {String(i + 1).padStart(2, '0')} / {String(timeline.scenes.length).padStart(2, '0')}
      </span>
      {s.title}
      <div className="mx-chip-progress" style={{ width: `${((t - s.start) / (s.end - s.start)) * 100}%` }} />
    </div>
  );
}

export function Disclaimer({ text }: { text: string }) {
  return <div className="mx-disclaimer">{text}</div>;
}

/**
 * Mid-video call to action (series rule): "Like & abonnieren" card that slides in,
 * the heart pops, the subscribe button flips to "Abonniert ✓". Deterministic in t.
 */
export function SubscribeCTA({ at, duration = 4.2, line = 'Mehr Maschinen von innen' }: { at: number; duration?: number; line?: string }) {
  const t = useTime((s) => s.time);
  const end = at + duration;
  if (t < at - 0.05 || t > end + 0.05) return null;
  const v = envelope(t, at, at + 0.5, end - 0.5, end);
  const k = t - at;
  // heart: pop at +0.8 s, fills red
  const liked = k > 0.8;
  const pop = liked ? 1 + 0.35 * Math.max(0, 1 - (k - 0.8) / 0.35) * Math.sin(Math.min(1, (k - 0.8) / 0.35) * Math.PI) : 1;
  // button: pressed at +1.7 s
  const subbed = k > 1.7;
  const press = k > 1.6 && k < 1.85 ? 0.92 : 1;
  return (
    <div className="mx-cta" style={{ opacity: v, transform: `translate(-50%, ${(1 - v) * -30}px) scale(${0.94 + 0.06 * v})` }}>
      <div className="mx-cta-heart" style={{ transform: `scale(${pop})` }}>
        <svg viewBox="0 0 24 24" width="76" height="76">
          <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.2 6 3.6 2.4-2.4 3.8-3.6 6-3.6 3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" fill={liked ? '#ff3b5c' : 'none'} stroke={liked ? '#ff3b5c' : '#fff'} strokeWidth="1.8" />
        </svg>
      </div>
      <div className="mx-cta-text">
        <div className="mx-cta-title">Like &amp; abonnieren</div>
        <div className="mx-cta-sub">{line}</div>
      </div>
      <div className={`mx-cta-btn${subbed ? ' on' : ''}`} style={{ transform: `scale(${press})` }}>
        {subbed ? 'Abonniert ✓' : 'Abonnieren'}
      </div>
    </div>
  );
}

/** "Richtig gemacht" series: series chip at the top (no progress bar, light style) */
export function SeriesChip({ series, title, from = 0 }: { series: string; title: string; from?: number }) {
  const t = useTime((s) => s.time);
  const v = envelope(t, from, from + 0.5, 1e9, 1e9 + 1);
  return (
    <div className="rg-chip" style={{ opacity: v }}>
      <span className="rg-chip-series">{series}</span>
      {title}
    </div>
  );
}

/** big ✕ / ✓ verdict stamp (wrong vs. right) */
export function Verdict({ kind, text, visible }: { kind: 'bad' | 'good'; text: string; visible: (t: number) => number }) {
  const t = useTime((s) => s.time);
  const v = visible(t);
  if (v < 0.005) return null;
  return (
    <div className={`rg-verdict rg-${kind}`} style={{ opacity: Math.min(1, v * 1.4), transform: `translateX(-50%) scale(${0.7 + 0.3 * v})` }}>
      <span className="rg-verdict-ico">{kind === 'bad' ? '✕' : '✓'}</span>
      {text}
    </div>
  );
}

/** closing card over the last seconds */
export function EndCard({ at, title, line }: { at: number; title: string; line: string }) {
  const t = useTime((s) => s.time);
  const v = envelope(t, at, at + 0.6, 1e9, 1e9 + 1);
  if (v < 0.005) return null;
  return (
    <div className="rg-end" style={{ opacity: v, transform: `translate(-50%, ${(1 - v) * 30}px)` }}>
      <div className="rg-end-title">{title}</div>
      <div className="rg-end-line">{line}</div>
    </div>
  );
}
