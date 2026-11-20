/**
 * Echte Ergebnisse von Video 1 (veröffentlicht): 4 Follower, 4 Likes, 2 Kommentare,
 * 2 Speicherungen, 0 Shares – und die Regel "nichts doppelt verarbeiten".
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { echteZahlen } from '../server/folgen.ts';
import { addEntry, addNamen, computeState, loadFile, newFile, saveFile } from '../server/store.ts';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sim-')), 'simulation.json');
const at = (iso: string) => new Date(iso);
const VIDEO1 = { mode: 'new' as const, followers: 4, likes: 4, comments: 2, shares: 0, saves: 2, ref: 'video-01' };

test('Video 1: 4 Einwohner, 40 L pro Tag, Likes 40 ml + Kommentare 1 L = 1,04 L, Speicherungen ohne Wasser', () => {
  let f = newFile('2026-11-14');
  f = addEntry(f, VIDEO1, at('2026-11-14T12:00:00Z')).file;
  const s = computeState(f, '2026-11-14');
  assert.equal(s.population, 4n);
  assert.equal(s.followers, 4n);
  assert.equal(s.dailyMl, 40_000n);                       // 4 × 10 L
  assert.equal(s.consumed.likes, 40n);                     // 4 × 10 ml
  assert.equal(s.consumed.comments, 1_000n);               // 2 × 0,5 L
  assert.equal(s.consumed.likes + s.consumed.comments, 1_040n);   // 1,04 L
  assert.equal(s.consumed.shares, 0n);
  assert.equal(s.saves, 2n);
  assert.equal(s.consumed.drinking, 40_000n);              // Ankunftstag: 4 × 10 L
  assert.equal(s.totalConsumedMl, 41_040n);                // nichts für Speicherungen
  assert.equal(s.remainingMl, s.totalWaterMl - 41_040n);
});

test('Gleiche Ergebnisse nicht doppelt: Referenz "video-01" kann nur einmal eingetragen werden', () => {
  let f = newFile('2026-11-14');
  f = addEntry(f, VIDEO1, at('2026-11-14T12:00:00Z')).file;
  assert.throws(() => addEntry(f, VIDEO1, at('2026-11-14T13:00:00Z')), /schon eingetragen/);
});

test('Folgevideo: nur neue Zahlen werden verarbeitet, Speichern/Laden ändert nichts', () => {
  const p = tmp();
  let f = newFile('2026-11-14');
  f = addEntry(f, VIDEO1, at('2026-11-14T12:00:00Z')).file;
  saveFile(f, p, at('2026-11-14T12:00:00Z'));
  saveFile(loadFile(p)!, p, at('2026-11-14T20:00:00Z'));   // mehrfach speichern: kein Doppelzählen
  assert.equal(loadFile(p)!.snapshot.totalConsumedMl, '41040');
  // Gesamtstand-Modus mit den TikTok-Gesamtzahlen von Video 1 -> keine neuen Aktivitäten
  const r = addEntry(loadFile(p)!, { mode: 'totals', followers: 4, likes: 4, comments: 2, saves: 2 }, at('2026-11-14T21:00:00Z'));
  assert.deepEqual(r.entry.followers + r.entry.likes + r.entry.comments + (r.entry.saves ?? 0), 0);
  // Vergleichsstand "vor video-01" für das Video
  const z = echteZahlen(p, 'video-01');
  assert.equal(z.seit!.population, '0');
  assert.equal(z.snapshot.population, '4');
  assert.equal(z.snapshot.saves, '2');
});

test('Folge 3: 21 Einwohner, 210 L/Tag, Folge-3-Aktivitäten 4,15 L, nichts doppelt', () => {
  let f = newFile('2026-11-14');
  f = addEntry(f, VIDEO1, at('2026-11-14T12:00:00Z')).file;
  f = addEntry(f, { mode: 'new', followers: 17, likes: 15, comments: 10, shares: 0, saves: 0, ref: 'video-02' }, at('2026-11-15T10:00:00Z')).file;
  const vorher = computeState(f, '2026-11-15');
  f = addEntry(f, { mode: 'new', followers: 0, likes: 15, comments: 8, shares: 0, ref: 'video-03' }, at('2026-11-15T11:00:00Z')).file;
  const s = computeState(f, '2026-11-15');
  assert.equal(s.followers, 21n);
  assert.equal(s.population, 21n);
  assert.equal(s.dailyMl, 210_000n);                                   // 21 × 10 L
  const extra = (x: typeof s) => x.consumed.likes + x.consumed.comments + x.consumed.shares;
  assert.equal(extra(s) - extra(vorher), 4_150n);                      // 150 ml + 4 L
  assert.equal(s.consumed.likes, 340n);                                // (4 + 15 + 15) × 10 ml
  assert.equal(s.consumed.comments, 10_000n);                          // (2 + 10 + 8) × 0,5 L
  // Trinken: 14.11. 4 × 10 L, 15.11. 4 × 10 L + 17 × 10 L (Ankunftstag)
  assert.equal(s.consumed.drinking, 250_000n);
  assert.equal(s.totalConsumedMl, 260_340n);
  // Tage ohne Video laufen weiter: 16.11. +210 L
  assert.equal(computeState(f, '2026-11-16').totalConsumedMl, 470_340n);
  assert.throws(() => addEntry(f, { mode: 'new', likes: 15, comments: 8, ref: 'video-03' }, at('2026-11-15T12:00:00Z')), /schon eingetragen/);
});

test('TikTok-Namen: exakt, eindeutig, dauerhaft, nicht mehr als Follower', () => {
  const p = tmp();
  let f = newFile('2026-11-14');
  f = addEntry(f, { mode: 'new', followers: 3 }, at('2026-11-14T12:00:00Z')).file;
  f = addNamen(f, ['@leonaprj', 'asen43013', '@cool.shorts38'], at('2026-11-14T12:00:00Z'));
  saveFile(f, p, at('2026-11-14T12:00:00Z'));
  const g = loadFile(p)!;
  assert.deepEqual(g.einwohnerNamen!.map((n) => [n.nr, n.name]), [[1, '@leonaprj'], [2, '@asen43013'], [3, '@cool.shorts38']]);
  assert.throws(() => addNamen(g, ['@LEONAPRJ'], at('2026-11-14T13:00:00Z')), /schon eingetragen/);
  assert.throws(() => addNamen(g, ['@neu'], at('2026-11-14T13:00:00Z')), /nur 3 Follower/);
  assert.throws(() => addNamen(g, ['@mit leerzeichen'], at('2026-11-14T13:00:00Z')), /Ungültiger/);
  // Speichern mit neuen Einträgen behält die Namen
  const h = addEntry(g, { mode: 'new', likes: 1 }, at('2026-11-14T14:00:00Z')).file;
  saveFile(h, p, at('2026-11-14T14:00:00Z'));
  assert.equal(loadFile(p)!.einwohnerNamen!.length, 3);
});

test('Echter Spielstand: alle 41 Namen exakt wie vorgegeben, alte Folgen bleiben reproduzierbar', () => {
  const soll = ['@leonaprj', '@asen43013', '@nicidragoon', '@magdaa605', '@cool.shorts38', '@jaime_1234456789', '@tim.maciejewski6',
    '@bjarne.brawl.star', '@kilianott5', '@kukuwasgehor', '@thomas15361', '@ghost155151', '@king.murat21', '@theeditz477',
    '@pancake.544', '@oskorro8', '@benniiideralpha', '@leon.gas1', '@ole201156', '@ezzeeyfn', '@locskai.bence',
    '@.45347', '@christophchaos', '@leon10202660', '@j.bln11', '@amir_78811', '@miss_sophie123',
    '@nerfsniper193', '@larsgamerpro', '@schnitti37', '@damiangaming67', '@mrsharkykitty', '@eli4s118', '@39_ita.s14',
    '@merlibiev06', '@quirin295', '@felieic', '@romeoweinstein', '@tom.e048', '@cr7.goat547', '@chab531'];
  const f = loadFile()!;
  assert.deepEqual(f.einwohnerNamen!.map((n) => n.name), soll);
  assert.deepEqual(f.einwohnerNamen!.map((n) => n.nr), soll.map((_, i) => i + 1));
  const z = echteZahlen(undefined, 'video-03', '2026-11-15');
  assert.equal(z.snapshot.population, '21');
  assert.equal(z.snapshot.totalConsumedMl, '260340');
  assert.equal(z.namen.length, 41);
  assert.equal(new Set(f.einwohnerNamen!.map((n) => n.name.toLowerCase())).size, 41);   // keine doppelten Figuren
  // Tag 4: 27 Einwohner, 270 L/Tag, Aktivitäten 1,63 L, Like weiterhin 10 ml
  const v4 = echteZahlen(undefined, 'video-04', '2026-11-16');
  assert.equal(v4.snapshot.population, '27');
  assert.equal(v4.seit!.population, '21');
  assert.equal(v4.snapshot.dailyMl, '270000');
  assert.equal(v4.snapshot.stufe.likeMl, '10');
  const extra = (x: typeof v4.snapshot) => BigInt(x.consumedMl.likes) + BigInt(x.consumedMl.comments) + BigInt(x.consumedMl.shares);
  assert.equal(extra(v4.snapshot) - extra(v4.seit!), 1_630n);           // 130 ml + 1,5 L
  // 260,34 L + 16.11.: 21 × 10 L + 6 × 10 L (Ankunftstag) + 1,63 L
  assert.equal(v4.snapshot.totalConsumedMl, '531970');
  // Tag 5: +10 -> 37 Einwohner, 370 L/Tag, Aktivitäten 5,18 L, 1 Speicherung ohne Wasser
  const v5 = echteZahlen(undefined, 'video-05', '2026-11-17');
  assert.equal(v5.snapshot.population, '37');
  assert.equal(v5.seit!.population, '27');
  assert.equal(v5.snapshot.dailyMl, '370000');
  assert.equal(v5.snapshot.stufe.likeMl, '10');
  assert.equal(extra(v5.snapshot) - extra(v5.seit!), 5_180n);           // 180 ml + 5 L
  assert.equal(BigInt(v5.snapshot.saves) - BigInt(v5.seit!.saves), 1n);
  // 531,97 L + 17.11.: 27 × 10 L + 10 × 10 L (Ankunftstag) + 5,18 L
  assert.equal(v5.snapshot.totalConsumedMl, '907150');
  // Tag 6: +4 -> 41, 410 L/Tag, 8 Likes + 2 Kommentare = 1,08 L; 907,15 + 370 + 40 + 1,08 = 1.318,23 L
  const v6 = echteZahlen(undefined, 'video-06', '2026-11-18');
  assert.equal(v6.snapshot.population, '41');
  assert.equal(v6.snapshot.dailyMl, '410000');
  assert.equal(extra(v6.snapshot) - extra(v6.seit!), 1_080n);
  assert.equal(v6.snapshot.totalConsumedMl, '1318230');
  assert.equal(v6.snapshot.naechste[0].follower, '100');
  // Tag 7: +5 (ohne Namen) -> 46, 460 L/Tag, 16 Likes + 1 Kommentar = 0,66 L
  // 1.318,23 L + 19.11.: 41 × 10 L + 20.11.: 41 × 10 L + 5 × 10 L (Ankunftstag) + 0,66 L = 2.188,89 L
  const v7 = echteZahlen(undefined, 'video-07', '2026-11-20');
  assert.equal(v7.snapshot.population, '46');
  assert.equal(v7.snapshot.dailyMl, '460000');
  assert.equal(extra(v7.snapshot) - extra(v7.seit!), 660n);
  assert.equal(v7.snapshot.totalConsumedMl, '2188890');
});
