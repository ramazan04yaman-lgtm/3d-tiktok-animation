/** Anzeige riesiger Zahlen auf Deutsch – ohne Genauigkeitsverlust (BigInt). */
import { ML_PER_LITER } from './config.ts';

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };

export function groupDE(n: bigint | number): string {
  const s = (typeof n === 'bigint' ? n : BigInt(Math.trunc(n))).toString();
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** ml -> Liter mit Nachkommastellen (exakt), z. B. 12345 ml -> "12,345" */
export function mlToLitersExact(ml: bigint): string {
  const neg = ml < 0n;
  const a = neg ? -ml : ml;
  const whole = a / ML_PER_LITER;
  const frac = a % ML_PER_LITER;
  const fracStr = frac === 0n ? '' : ',' + frac.toString().padStart(3, '0').replace(/0+$/, '');
  return (neg ? '-' : '') + groupDE(whole) + fracStr;
}

/** Wissenschaftliche Schreibweise: 1386000000000000000000 -> "1,386 × 10²¹" */
export function sci(n: bigint, digits = 4): string {
  if (n === 0n) return '0';
  const s = (n < 0n ? -n : n).toString();
  const exp = s.length - 1;
  let mant = s[0];
  const rest = s.slice(1, digits).replace(/0+$/, '');
  if (rest) mant += ',' + rest;
  const e = String(exp).split('').map((c) => SUP[c]).join('');
  return (n < 0n ? '-' : '') + `${mant} × 10${e}`;
}

/** Liter-Anzeige: bis 1 Billion ausgeschrieben, darüber wissenschaftlich. */
export function formatLiters(ml: bigint): string {
  const liters = ml / ML_PER_LITER;
  if (liters < 1_000_000_000_000n) return mlToLitersExact(ml) + ' L';
  return sci(liters) + ' L';
}

/** Kleine Mengen: 110 ml / 1,5 L / 20 L; große Mengen wie formatLiters. */
export function formatMenge(ml: bigint): string {
  if (ml < ML_PER_LITER) return `${ml} ml`;
  return formatLiters(ml);
}

/** Kurzform für große Liter-Mengen mit Wort: 2,5 Mio. L / 3,1 Mrd. L ... */
export function formatLitersShort(ml: bigint): string {
  const l = Number(ml) / 1000;
  const units: [number, string][] = [[1e18, 'Trillionen'], [1e15, 'Billiarden'], [1e12, 'Billionen'], [1e9, 'Mrd.'], [1e6, 'Mio.']];
  for (const [v, name] of units) {
    if (l >= v) return (l / v).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' ' + name + ' L';
  }
  return l.toLocaleString('de-DE', { maximumFractionDigits: 3 }) + ' L';
}

/** Exakter Prozentsatz a/b mit vielen Nachkommastellen (BigInt-Division). */
export function percentExact(a: bigint, b: bigint, decimals = 12): string {
  if (b === 0n) return '0';
  const scale = 10n ** BigInt(decimals);
  const v = (a * 100n * scale) / b; // abgeschnitten, nicht gerundet
  const whole = v / scale;
  const frac = (v % scale).toString().padStart(decimals, '0');
  return groupDE(whole) + ',' + frac;
}

/** Dauer in Tagen -> lesbarer Text (Jahre, ggf. wissenschaftlich). */
export function formatDuration(days: bigint | null): string {
  if (days === null) return '∞ (noch niemand trinkt)';
  if (days === 1n) return '1 Tag';
  if (days < 365n) return groupDE(days) + ' Tage';
  const years = days / 365n;
  if (years < 1_000_000_000n) return groupDE(years) + ' Jahre';
  return sci(years, 3) + ' Jahre';
}

/** Zehnerlogarithmus einer (riesigen) BigInt-Zahl, ausreichend genau für Grafik. */
export function log10Big(n: bigint): number {
  if (n <= 0n) return -Infinity;
  const s = n.toString();
  const lead = Number(s.slice(0, 16));
  return Math.log10(lead) + (s.length - Math.min(16, s.length));
}
