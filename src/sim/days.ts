/**
 * Kalendertage. Ein "Tag" ist ein Datum im Format JJJJ-MM-TT in einer festen
 * Zeitzone (Standard: Europe/Berlin). So zählt jeder Tag genau einmal –
 * egal ob Sommer-/Winterzeit oder wann das Programm gestartet wird.
 */
export type Day = string; // "2026-11-12"

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(day: string): boolean {
  if (!DAY_RE.test(day)) return false;
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function assertDay(day: string, what = 'Datum'): Day {
  if (!isValidDay(day)) throw new Error(`${what} ungültig: "${day}" (erwartet JJJJ-MM-TT)`);
  return day;
}

/** Tageszahl seit 1970-01-01 (ganzzahlig, unabhängig von Uhrzeit/Zeitzone). */
export function dayNumber(day: Day): number {
  const [y, m, d] = assertDay(day).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function dayFromNumber(n: number): Day {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** Anzahl Tage von a nach b (b - a). */
export function daysBetween(a: Day, b: Day): number {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(day: Day, n: number): Day {
  return dayFromNumber(dayNumber(day) + n);
}

/** Das heutige Datum in der gegebenen Zeitzone. */
export function todayIn(timeZone: string, now: Date = new Date()): Day {
  // en-CA liefert das Format JJJJ-MM-TT
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}
