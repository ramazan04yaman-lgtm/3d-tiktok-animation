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
