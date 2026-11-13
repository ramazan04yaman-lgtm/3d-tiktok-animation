/**
 * VERBRAUCHSSTUFEN: Welche Verbrauchswerte gelten bei einer bestimmten Followerzahl?
 * Alles mit BigInt -> exakt, auch bei riesigen Zahlen (2 hoch 1000 ist kein Problem).
 */
import type { SimConfig } from './config.ts';

/**
 * Anzahl der Verdopplungen der Trinkmenge bei einer Followerzahl.
 * Phase 1: je trinkSchritt (1.000) eine Verdopplung, höchstens trinkMaxStufen (10) -> Ende bei 10.000 Followern.
 * Phase 2: ab dem Ende von Phase 1 je trinkSchritt2 (10.000) eine weitere Verdopplung.
 * Bei genau 10.000 Followern: 10 + 0 = 10 Verdopplungen (keine doppelte Verdopplung).
 */
export function trinkVerdopplungen(followers: bigint, config: SimConfig): bigint {
  const m = config.meilensteine;
  const f = followers < 0n ? 0n : followers;
  const phase1 = f / m.trinkSchritt;
  if (m.trinkMaxStufen === null || phase1 < m.trinkMaxStufen) return phase1;   // Phase 1
  if (m.trinkSchritt2 === null) return m.trinkMaxStufen;                        // gedeckelt
  const ende = m.trinkSchritt * m.trinkMaxStufen;                               // 10.000 Follower
  return m.trinkMaxStufen + (f - ende) / m.trinkSchritt2;                       // Phase 2
}

/** Follower-Zahl der nächsten Verdopplung. */
export function naechsteVerdopplung(followers: bigint, config: SimConfig): bigint | null {
  const m = config.meilensteine;
  const ende = m.trinkMaxStufen === null ? null : m.trinkSchritt * m.trinkMaxStufen;
  if (ende === null || followers < ende) {
    return (followers / m.trinkSchritt + 1n) * m.trinkSchritt;
  }
  if (m.trinkSchritt2 === null) return null;
  return ende + ((followers - ende) / m.trinkSchritt2 + 1n) * m.trinkSchritt2;
}

/** Ist die Trinkmenge gedeckelt (keine weitere Verdopplung möglich)? */
export function trinkMaximum(followers: bigint, config: SimConfig): boolean {
  return naechsteVerdopplung(followers, config) === null;
}

export interface Stufe {
  /** Gültige Werte in ml. */
  likeMl: bigint;
  kommentarMl: bigint;
  shareMl: bigint;
  /** Trinkmenge pro Einwohner und Tag in ml. */
  trinkMl: bigint;
  /** Anzahl erreichter Meilensteine je Regel. */
  stufen: { like: bigint; kommentar: bigint; share: bigint; trinken: bigint };
}

export interface NaechsterMeilenstein {
  regel: 'like' | 'kommentar' | 'share' | 'trinken';
  /** Bei dieser Followerzahl wird er erreicht. */
  follower: bigint;
  /** Neuer Wert in ml (pro Like/Kommentar/Share bzw. pro Einwohner und Tag). */
  neuMl: bigint;
}

/** Gilt die Meilenstein-Regel an diesem Tag? (Vor dem Aktivierungstag: feste Grundwerte.) */
export function meilensteineAktiv(config: SimConfig, day: string): boolean {
  return config.meilensteine.abTag === null || day >= config.meilensteine.abTag;
}

/** Verbrauchswerte für eine Followerzahl. */
export function stufeFuer(followers: bigint, config: SimConfig, aktiv = true): Stufe {
  const m = config.meilensteine;
  const f = followers < 0n ? 0n : followers;
  const st = aktiv
    ? { like: f / m.likeSchritt, kommentar: f / m.kommentarSchritt, share: f / m.shareSchritt,
        trinken: trinkVerdopplungen(f, config) }
    : { like: 0n, kommentar: 0n, share: 0n, trinken: 0n };
  return {
    likeMl: config.mlPerLike + st.like * m.likePlusMl,
    kommentarMl: config.mlPerComment + st.kommentar * m.kommentarPlusMl,
    shareMl: config.mlPerShare + st.share * m.sharePlusMl,
    trinkMl: config.mlPerPersonPerDay * m.trinkFaktor ** st.trinken,
    stufen: st,
  };
}

/** Die nächsten Meilensteine je Regel (sortiert: der nächste zuerst). */
export function naechsteMeilensteine(followers: bigint, config: SimConfig): NaechsterMeilenstein[] {
  const m = config.meilensteine;
  const next = (schritt: bigint) => (followers / schritt + 1n) * schritt;
  const list: NaechsterMeilenstein[] = [
    { regel: 'like', follower: next(m.likeSchritt), neuMl: 0n },
    { regel: 'kommentar', follower: next(m.kommentarSchritt), neuMl: 0n },
    { regel: 'share', follower: next(m.shareSchritt), neuMl: 0n },
  ];
  const nv = naechsteVerdopplung(followers, config);
  if (nv !== null) list.push({ regel: 'trinken', follower: nv, neuMl: 0n });
  for (const n of list) {
    const s = stufeFuer(n.follower, config);
    n.neuMl = n.regel === 'like' ? s.likeMl : n.regel === 'kommentar' ? s.kommentarMl : n.regel === 'share' ? s.shareMl : s.trinkMl;
  }
  return list.sort((a, b) => (a.follower < b.follower ? -1 : a.follower > b.follower ? 1 : 0));
}
