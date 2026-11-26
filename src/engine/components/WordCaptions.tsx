import { useTime } from '../time';

export interface Word {
  w: string;
  s: number;
  e: number;
}

/**
 * "Richtig gemacht" series: one spoken word at a time, big and centred, synced to the narration.
 * Key terms (`highlight`) are drawn in the accent colour.
 */
export function WordCaptions({ words, highlight = [], hide }: { words: Word[]; highlight?: string[]; hide?: (t: number) => boolean }) {
  const t = useTime((s) => s.time);
  if (hide?.(t)) return null;
  // the current word, or the last one for a short moment inside small gaps
  let cur: Word | undefined;
  for (const w of words) {
    if (w.s <= t + 0.02 && t < w.e + 0.18) cur = w;
    if (w.s > t) break;
  }
  if (!cur) return null;
  const k = Math.min(1, (t - cur.s + 0.02) / 0.08);
  const hot = highlight.some((h) => cur!.w.toLowerCase().startsWith(h.toLowerCase()));
  return (
    <div className="rg-word" style={{ transform: `translateX(-50%) scale(${0.86 + 0.14 * k})` }}>
      <span className={hot ? 'rg-hot' : ''}>{cur.w}</span>
    </div>
  );
}
