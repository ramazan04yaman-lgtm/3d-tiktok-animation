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
import { addEntry, computeState, loadFile, newFile, saveFile } from '../server/store.ts';

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
