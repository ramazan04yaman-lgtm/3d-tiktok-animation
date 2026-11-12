import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, ML_PER_LITER } from '../src/sim/config.ts';
import { addDays, daysBetween, todayIn } from '../src/sim/days.ts';
import { formatLiters, percentExact, sci } from '../src/sim/format.ts';
import { type Entry, daysUntilEmpty, deltasFromTotals, replay } from '../src/sim/simulation.ts';

const L = ML_PER_LITER;
let n = 0;
const entry = (day: string, p: Partial<Entry> = {}): Entry => ({
  id: `e${++n}`, day, createdAt: `${day}T12:00:00.${String(n).padStart(3, '0')}Z`,
  followers: 0, likes: 0, comments: 0, shares: 0, ...p,
});

test('Startvorrat: 1,386 Mrd. km³ = 1,386 × 10²¹ Liter, exakt', () => {
  assert.equal(DEFAULT_CONFIG.totalWaterMl / L, 1_386_000_000_000_000_000_000n);
  assert.equal(sci(DEFAULT_CONFIG.totalWaterMl / L), '1,386 × 10²¹');
});

test('Beispiele aus der Aufgabe: X Menschen trinken 10 × X Liter pro Tag', () => {
  for (const [people, liters] of [[100, 1_000n], [1_000, 10_000n], [10_000, 100_000n], [100_000, 1_000_000n]] as const) {
    const s = replay('2026-01-01', [entry('2026-01-01', { followers: people })], '2026-01-01');
    assert.equal(s.population, BigInt(people));
    assert.equal(s.dailyMl, liters * L);
  }
});

test('Mehrere Tage ohne Video werden alle berechnet (Ankunftstag zählt mit)', () => {
  const e = [entry('2026-01-01', { followers: 100 })];
  // 1.1. bis 5.1. = 5 Tage × 1.000 L
  const s = replay('2026-01-01', e, '2026-01-05');
  assert.equal(s.consumed.drinking, 5_000n * L);
  assert.equal(s.daysProcessed, 5);
  assert.equal(s.lastProcessedDay, '2026-01-05');
});

test('Wachstum über mehrere Tage', () => {
  const e = [
    entry('2026-01-01', { followers: 10 }),
    entry('2026-01-03', { followers: 5 }),   // ab 3.1. 15 Menschen
    entry('2026-01-03', { followers: 5 }),   // ab 3.1. 20 Menschen
    entry('2026-01-10', { followers: 80 }),  // ab 10.1. 100 Menschen
  ];
  const s = replay('2026-01-01', e, '2026-01-12');
  // 1.-2.: 10×2 = 20 | 3.-9.: 20×7 = 140 | 10.-12.: 100×3 = 300  => 460 Menschentage × 10 L
  assert.equal(s.consumed.drinking, 4_600n * L);
  assert.equal(s.population, 100n);
  assert.equal(s.followers, 100n);
});

test('Kein Tag doppelt: Nachrechnen ist immer gleich (idempotent)', () => {
  const e = [entry('2026-02-01', { followers: 7, likes: 3 }), entry('2026-02-04', { followers: 2, shares: 1 })];
  const a = replay('2026-02-01', e, '2026-02-20');
  const b = replay('2026-02-01', e, '2026-02-20');
  const c = replay('2026-02-01', [...e].reverse(), '2026-02-20'); // Reihenfolge egal
  assert.deepEqual(a, b);
  assert.equal(a.totalConsumedMl, c.totalConsumedMl);
  // Tag für Tag nachrechnen = Gesamtrechnung
  let sum = 0n;
  for (let d = '2026-02-01'; d <= '2026-02-20'; d = addDays(d, 1)) sum += (d < '2026-02-04' ? 7n : 9n) * 10n * L;
  assert.equal(a.consumed.drinking, sum);
});

test('Likes, Kommentare und Shares: einmalige Zusatzmengen', () => {
  const s = replay('2026-01-01', [entry('2026-01-01', { likes: 1000, comments: 10, shares: 3 })], '2026-03-01');
  assert.equal(s.consumed.likes, 10_000n);       // 1000 × 10 ml = 10 L
  assert.equal(s.consumed.comments, 5_000n);     // 10 × 500 ml = 5 L
  assert.equal(s.consumed.shares, 6_000n);       // 3 × 2 L = 6 L
  assert.equal(s.consumed.drinking, 0n);         // niemand lebt dort
  assert.equal(s.totalConsumedMl, 21_000n);
  assert.equal(s.remainingMl, DEFAULT_CONFIG.totalWaterMl - 21_000n);
});

test('Summe aller Verbrauchsarten stimmt immer', () => {
  const s = replay('2026-01-01', [
    entry('2026-01-01', { followers: 3, likes: 7, comments: 1, shares: 1 }),
    entry('2026-01-04', { followers: 1, likes: 1 }),
  ], '2026-01-06');
  const c = s.consumed;
  assert.equal(s.totalConsumedMl, c.drinking + c.likes + c.comments + c.shares);
  assert.equal(s.totalConsumedMl + s.remainingMl, s.totalWaterMl);
  assert.equal(c.drinking, (3n * 6n + 1n * 3n) * 10n * L);
});

test('Doppelte IDs und Referenzen werden abgelehnt', () => {
  const a = entry('2026-01-01', { followers: 1, ref: 'video-1' });
  assert.throws(() => replay('2026-01-01', [a, { ...a }], '2026-01-02'), /Doppelte/);
  assert.throws(() => replay('2026-01-01', [a, entry('2026-01-01', { ref: 'video-1' })], '2026-01-02'), /Referenz/);
});

test('Ungültige Eingaben werden abgelehnt', () => {
  assert.throws(() => replay('2026-01-01', [entry('2026-01-01', { followers: -1 })], '2026-01-02'));
  assert.throws(() => replay('2026-01-01', [entry('2026-01-01', { likes: 1.5 })], '2026-01-02'));
  assert.throws(() => replay('2026-01-01', [entry('2025-12-31')], '2026-01-02'), /Starttag/);
  assert.throws(() => replay('2026-01-01', [entry('2026-01-05')], '2026-01-02'), /Zukunft/);
  assert.throws(() => replay('2026-02-30', [], '2026-03-01'), /ungültig/);
});

test('Gesamtstand-Modus: nur echte Zuwächse zählen, Rückgänge nicht doppelt', () => {
  let s = replay('2026-01-01', [], '2026-01-01');
  let r = deltasFromTotals(s, { followers: 500, likes: 1000 });
  assert.deepEqual(r.deltas, { followers: 500, likes: 1000, comments: 0, shares: 0 });
  const e1 = entry('2026-01-01', { ...r.deltas, reportedTotals: { followers: 500, likes: 1000 } });
  s = replay('2026-01-01', [e1], '2026-01-02');
  r = deltasFromTotals(s, { followers: 480 }); // 20 entfolgt
  assert.equal(r.deltas.followers, 0);
  assert.equal(r.warnings.length, 1);
  const e2 = entry('2026-01-02', { ...r.deltas, reportedTotals: { followers: 480 } });
  s = replay('2026-01-01', [e1, e2], '2026-01-03');
  r = deltasFromTotals(s, { followers: 530 }); // erst ab 500 wird neu gezählt
  assert.equal(r.deltas.followers, 30);
});

test('Gesamtstand nach "Neu"-Einträgen zählt nichts doppelt', () => {
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 100, likes: 1000 })], '2026-01-02');
  const r = deltasFromTotals(s, { followers: 150, likes: 1500 });
  assert.equal(r.deltas.followers, 50);
  assert.equal(r.deltas.likes, 500);
});

test('Riesige Zahlen bleiben exakt (keine Rundungsfehler)', () => {
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 8_000_000_000, likes: 9_000_000_000_000 })], addDays('2026-01-01', 99_999));
  // 8 Mrd. Menschen × 100.000 Tage × 10 L = 8 × 10^15 L
  assert.equal(s.consumed.drinking, 8_000_000_000n * 100_000n * 10n * L);
  assert.equal(s.consumed.likes, 90_000_000_000_000n);
  assert.equal(s.totalConsumedMl + s.remainingMl, s.totalWaterMl);
  assert.equal(formatLiters(s.consumed.drinking), '8 × 10¹⁵ L');
});

test('Wasser geht aus: Tag des Versiegens wird exakt bestimmt', () => {
  const cfg = { ...DEFAULT_CONFIG, totalWaterMl: 1_000n * L }; // Mini-Erde mit 1000 L
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 30 })], '2026-01-10', cfg);
  // 300 L pro Tag: nach 1.1. 300, 2.1. 600, 3.1. 900, 4.1. 1200 -> leer am 4.1.
  assert.equal(s.depletedOnDay, '2026-01-04');
  assert.equal(s.remainingMl, 0n);
  assert.equal(daysUntilEmpty(s), 0n);
});

test('Reichweite: so viele Tage reicht das Wasser noch', () => {
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 1_000_000 })], '2026-01-01');
  const d = daysUntilEmpty(s)!;
  assert.ok(d * s.dailyMl >= s.remainingMl && (d - 1n) * s.dailyMl < s.remainingMl);
});

test('Tage über Sommerzeit-Wechsel und Jahresgrenzen', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysBetween('2027-12-31', '2028-03-01'), 61); // Schaltjahr
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  // 23:30 UTC am 12.11. ist in Berlin schon der 13.11.
  assert.equal(todayIn('Europe/Berlin', new Date('2026-11-12T23:30:00Z')), '2026-11-13');
});

test('Exakte Prozentanzeige', () => {
  assert.equal(percentExact(1n, 3n, 4), '33,3333');
  assert.equal(percentExact(DEFAULT_CONFIG.totalWaterMl - 1000n, DEFAULT_CONFIG.totalWaterMl, 22), '99,9999999999999999999278'); // 100 % − 7,2 × 10⁻²⁰ %
});
