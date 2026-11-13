/**
 * Alle Regeln der Simulation an einem Ort.
 * Wassermengen werden intern in MILLILITERN als BigInt gespeichert.
 * BigInt = ganze Zahl ohne Größenbegrenzung -> keine Rundungsfehler, auch bei 10^24.
 */
export interface SimConfig {
  /** Start-Wasservorrat der Erde in Millilitern (Näherungswert!). */
  totalWaterMl: bigint;
  /** Trinkmenge pro Mensch und Tag in ml. */
  mlPerPersonPerDay: bigint;
  /** Einmaliger Zusatzverbrauch pro Like/Kommentar/Share in ml. */
  mlPerLike: bigint;
  mlPerComment: bigint;
  mlPerShare: bigint;
  /** Zeitzone, in der ein Kalendertag gezählt wird. */
  timeZone: string;
  /** Meilenstein-Regeln (wachsender Verbrauch). */
  meilensteine: MeilensteinRegeln;
}

/**
 * MEILENSTEIN-REGELN – der Verbrauch wächst mit der GESAMTEN erreichten Followerzahl:
 *  - Like:      10 ml  + (Anzahl erreichter 100er-Meilensteine) × 100 ml
 *  - Kommentar: 0,5 L  + (Anzahl erreichter 250er-Meilensteine) × 1 L
 *  - Share:     2 L    + (Anzahl erreichter 500er-Meilensteine) × 4 L
 *  - Trinken:   10 L × 2 hoch (Anzahl Verdopplungen) pro Einwohner und Tag, für die GESAMTE Bevölkerung
 *      Phase 1 (0–10.000 Follower):  je 1.000er-Meilenstein eine Verdopplung (höchstens 10)
 *      Phase 2 (ab 10.000 Followern): je weiterem 10.000er-Meilenstein eine Verdopplung
 *      -> 1.000: 20 L · 9.000: 5.120 L · 10.000: 10.240 L · 20.000: 20.480 L · 100.000: 5.242.880 L
 */
export interface MeilensteinRegeln {
  /** Ab diesem Tag gelten die Meilenstein-Regeln (vorher: feste Grundwerte). */
  abTag: string | null;
  likeSchritt: bigint;      likePlusMl: bigint;
  kommentarSchritt: bigint; kommentarPlusMl: bigint;
  shareSchritt: bigint;     sharePlusMl: bigint;
  trinkSchritt: bigint;     trinkFaktor: bigint;
  /** Phase 1: höchstens so viele Verdopplungen im Schritt trinkSchritt (null = unbegrenzt). */
  trinkMaxStufen: bigint | null;
  /** Phase 2: danach je so viele Follower eine weitere Verdopplung (null = keine Phase 2). */
  trinkSchritt2: bigint | null;
}

export const DEFAULT_MEILENSTEINE: MeilensteinRegeln = {
  abTag: null,
  likeSchritt: 100n, likePlusMl: 100n,
  kommentarSchritt: 250n, kommentarPlusMl: 1000n,
  shareSchritt: 500n, sharePlusMl: 4000n,
  trinkSchritt: 1_000n, trinkFaktor: 2n, trinkMaxStufen: 10n, trinkSchritt2: 10_000n,
};

/** 1 km³ = 10^12 Liter = 10^15 ml */
export const ML_PER_LITER = 1000n;
export const ML_PER_KM3 = 10n ** 15n;

/**
 * Gesamtwasser der Erde: ca. 1,386 Milliarden km³ (USGS/Shiklomanov-Schätzung,
 * Salz- und Süßwasser). NÄHERUNGSWERT.
 * 1.386.000.000 km³ = 1,386 × 10^21 Liter = 1,386 × 10^24 ml
 */
export const EARTH_WATER_KM3 = 1_386_000_000n;

export const DEFAULT_CONFIG: SimConfig = {
  totalWaterMl: EARTH_WATER_KM3 * ML_PER_KM3,
  mlPerPersonPerDay: 10n * ML_PER_LITER, // 10 Liter
  mlPerLike: 10n,                         // 10 ml
  mlPerComment: 500n,                     // 500 ml
  mlPerShare: 2n * ML_PER_LITER,          // 2 Liter
  timeZone: 'Europe/Berlin',
  meilensteine: DEFAULT_MEILENSTEINE,
};

/** Konfiguration als JSON-taugliches Objekt (BigInt -> String). */
export interface SimConfigJSON {
  totalWaterMl: string;
  mlPerPersonPerDay: string;
  mlPerLike: string;
  mlPerComment: string;
  mlPerShare: string;
  timeZone: string;
  /** Version der Regeln: 2 = mit Meilensteinen. */
  regelVersion?: number;
  meilensteine?: Record<string, string | null>;
}

export function configToJSON(c: SimConfig): SimConfigJSON {
  return {
    totalWaterMl: c.totalWaterMl.toString(),
    mlPerPersonPerDay: c.mlPerPersonPerDay.toString(),
    mlPerLike: c.mlPerLike.toString(),
    mlPerComment: c.mlPerComment.toString(),
    mlPerShare: c.mlPerShare.toString(),
    timeZone: c.timeZone,
    regelVersion: 2,
    meilensteine: Object.fromEntries(Object.entries(c.meilensteine).map(([k, v]) => [k, v === null ? null : String(v)])),
  };
}

export function configFromJSON(j: Partial<SimConfigJSON> | undefined): SimConfig {
  const d = DEFAULT_CONFIG;
  return {
    totalWaterMl: j?.totalWaterMl ? BigInt(j.totalWaterMl) : d.totalWaterMl,
    mlPerPersonPerDay: j?.mlPerPersonPerDay ? BigInt(j.mlPerPersonPerDay) : d.mlPerPersonPerDay,
    mlPerLike: j?.mlPerLike ? BigInt(j.mlPerLike) : d.mlPerLike,
    mlPerComment: j?.mlPerComment ? BigInt(j.mlPerComment) : d.mlPerComment,
    mlPerShare: j?.mlPerShare ? BigInt(j.mlPerShare) : d.mlPerShare,
    timeZone: j?.timeZone ?? d.timeZone,
    meilensteine: meilensteineFromJSON(j?.meilensteine),
  };
}

function meilensteineFromJSON(m: Record<string, string | null> | undefined): MeilensteinRegeln {
  const d = DEFAULT_MEILENSTEINE;
  if (!m) return { ...d };
  const b = (k: keyof MeilensteinRegeln, def: bigint) => (m[k] ? BigInt(m[k] as string) : def);
  return {
    abTag: m.abTag ?? null,
    likeSchritt: b('likeSchritt', d.likeSchritt), likePlusMl: b('likePlusMl', d.likePlusMl),
    kommentarSchritt: b('kommentarSchritt', d.kommentarSchritt), kommentarPlusMl: b('kommentarPlusMl', d.kommentarPlusMl),
    shareSchritt: b('shareSchritt', d.shareSchritt), sharePlusMl: b('sharePlusMl', d.sharePlusMl),
    trinkSchritt: b('trinkSchritt', d.trinkSchritt), trinkFaktor: b('trinkFaktor', d.trinkFaktor),
    trinkMaxStufen: 'trinkMaxStufen' in m ? (m.trinkMaxStufen === null ? null : BigInt(m.trinkMaxStufen)) : d.trinkMaxStufen,
    trinkSchritt2: 'trinkSchritt2' in m ? (m.trinkSchritt2 === null ? null : BigInt(m.trinkSchritt2)) : d.trinkSchritt2,
  };
}
