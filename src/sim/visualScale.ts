/**
 * VISUELLE SKALIERUNG
 *
 * Problem: 1 Million Liter sind im Vergleich zu 1,386 × 10²¹ Litern winzig
 * (0,00000000000007 %). Echt dargestellt würde man NICHTS sehen.
 * Lösung: Die ANZEIGE der Erde wird verstärkt; die ZAHLEN bleiben exakt.
 *
 * Modi:
 *  - "log"  (Standard): logarithmische Skala. Jede Verzehnfachung des
 *           Verbrauchs lässt den Meeresspiegel um einen festen Schritt sinken.
 *           Bei 100 % Verbrauch ist die Erde auch optisch komplett trocken.
 *  - "real": ehrliche, unverstärkte Darstellung (praktisch unsichtbar).
 *  - "boost": linear mit einem Verstärkungsfaktor.
 */
import { log10Big } from './format.ts';

export type VisualMode = 'log' | 'real' | 'boost';

export interface VisualScaleOptions {
  mode: VisualMode;
  /** log: ab diesem Verbrauch (Liter) beginnt der sichtbare Effekt. */
  logStartLiters: number;
  /** boost: Verstärkungsfaktor. */
  boost: number;
}

export const DEFAULT_VISUAL: VisualScaleOptions = { mode: 'log', logStartLiters: 1e4, boost: 1e12 };

/** Liefert den optisch "ausgetrunkenen" Anteil 0..1. */
export function visualDrainFraction(consumedMl: bigint, totalMl: bigint, o: VisualScaleOptions = DEFAULT_VISUAL): number {
  if (consumedMl <= 0n) return 0;
  if (consumedMl >= totalMl) return 1;
  const real = Number((consumedMl * 1_000_000_000_000n) / totalMl) / 1e12;
  if (o.mode === 'real') return real;
  if (o.mode === 'boost') return Math.min(1, real * o.boost);
  const lc = log10Big(consumedMl) - 3; // Liter
  const lt = log10Big(totalMl) - 3;
  const l0 = Math.log10(o.logStartLiters);
  return Math.min(1, Math.max(0, (lc - l0) / (lt - l0)));
}

/** Hypsometrie: Meeresspiegel (m) für einen verbleibenden Volumenanteil. */
export interface Hypsometry { levels_m: number[]; volume_fraction: number[]; area_fraction: number[] }

/**
 * Meeresspiegel (m), bei dem der Anteil `dried` (0..1) der heutigen Meeresfläche
 * trockengefallen ist. Dadurch wächst die sichtbare Veränderung gleichmäßig
 * mit der visuellen Skala (die Tiefen kommen aus echten ETOPO1-Daten).
 */
export function seaLevelForDriedArea(h: Hypsometry, dried: number): number {
  return levelFor(h.levels_m, h.area_fraction, 1 - dried);
}

export function seaLevelForRemaining(h: Hypsometry, remainingFraction: number): number {
  return levelFor(h.levels_m, h.volume_fraction, remainingFraction);
}

function levelFor(levels: number[], v: number[], frac: number): number {
  const r = Math.min(1, Math.max(0, frac));
  if (r <= 0) return levels[0];
  // volume_fraction ist aufsteigend -> binäre Suche + lineare Interpolation
  let lo = 0, hi = v.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (v[mid] < r) lo = mid; else hi = mid;
  }
  const t = (r - v[lo]) / Math.max(1e-12, v[hi] - v[lo]);
  return levels[lo] + t * (levels[hi] - levels[lo]);
}
