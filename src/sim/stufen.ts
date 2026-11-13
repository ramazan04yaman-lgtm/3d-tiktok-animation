/**
 * VERBRAUCHSSTUFEN: Welche Verbrauchswerte gelten bei einer bestimmten Followerzahl?
 * Alles mit BigInt -> exakt, auch bei riesigen Zahlen (2 hoch 1000 ist kein Problem).
 */
import type { SimConfig } from './config.ts';

/** Ist die maximale Trinkmenge erreicht? */
export function trinkMaximum(followers: bigint, config: SimConfig): boolean {
  return followers / config.meilensteine.trinkSchritt >= config.meilensteine.trinkMaxStufen;
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
        // Verdopplung nur bis zur Höchststufe (10 Stufen = 10.000 Follower), danach bleibt die Trinkmenge gleich
        trinken: f / m.trinkSchritt > m.trinkMaxStufen ? m.trinkMaxStufen : f / m.trinkSchritt }
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
  // Trink-Verdopplung nur, solange die Höchststufe noch nicht erreicht ist
  if (followers / m.trinkSchritt < m.trinkMaxStufen) list.push({ regel: 'trinken', follower: next(m.trinkSchritt), neuMl: 0n });
  for (const n of list) {
    const s = stufeFuer(n.follower, config);
    n.neuMl = n.regel === 'like' ? s.likeMl : n.regel === 'kommentar' ? s.kommentarMl : n.regel === 'share' ? s.shareMl : s.trinkMl;
  }
  return list.sort((a, b) => (a.follower < b.follower ? -1 : a.follower > b.follower ? 1 : 0));
}
