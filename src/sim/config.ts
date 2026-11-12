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
}

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
};

/** Konfiguration als JSON-taugliches Objekt (BigInt -> String). */
export interface SimConfigJSON {
  totalWaterMl: string;
  mlPerPersonPerDay: string;
  mlPerLike: string;
  mlPerComment: string;
  mlPerShare: string;
  timeZone: string;
}

export function configToJSON(c: SimConfig): SimConfigJSON {
  return {
    totalWaterMl: c.totalWaterMl.toString(),
    mlPerPersonPerDay: c.mlPerPersonPerDay.toString(),
    mlPerLike: c.mlPerLike.toString(),
    mlPerComment: c.mlPerComment.toString(),
    mlPerShare: c.mlPerShare.toString(),
    timeZone: c.timeZone,
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
  };
}
