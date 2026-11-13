import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { addEntry, loadFile, newFile, removeEntry, saveFile } from '../server/store.ts';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sim-')), 'simulation.json');
const at = (iso: string) => new Date(iso);

test('Speichern, Laden und Weiterrechnen über mehrere Tage (Videos an verschiedenen Tagen)', () => {
  const p = tmp();
  // Tag 1: Start + erstes Video
  let f = newFile('2026-11-12');
  f = addEntry(f, { mode: 'new', followers: 100, likes: 1000 }, at('2026-11-12T10:00:00Z')).file;
  saveFile(f, p, at('2026-11-12T10:00:00Z'));
  let loaded = loadFile(p)!;
  // 100 Follower = Like-Meilenstein erreicht -> 110 ml pro Like
  assert.equal(loaded.snapshot.totalConsumedMl, String(100n * 10_000n + 1000n * 110n));
  assert.equal(loaded.snapshot.stufe.likeMl, '110');
  assert.equal(loaded.snapshot.naechste[0].follower, '200');

  // 4 Tage kein Video -> beim nächsten Speichern (16.11.) sind 5 Tage verbucht
  saveFile(loaded, p, at('2026-11-16T09:00:00Z'));
  loaded = loadFile(p)!;
  assert.equal(loaded.lastProcessedDay, '2026-11-16');
  assert.equal(loaded.snapshot.consumedMl.drinking, String(5n * 100n * 10_000n));

  // Mehrfaches Speichern am selben Tag verbucht NICHTS doppelt
  saveFile(loaded, p, at('2026-11-16T18:00:00Z'));
  saveFile(loadFile(p)!, p, at('2026-11-16T23:59:00Z')); // 23:59 UTC = 00:59 Berlin am 17.!
  loaded = loadFile(p)!;
  assert.equal(loaded.lastProcessedDay, '2026-11-17');
  assert.equal(loaded.snapshot.consumedMl.drinking, String(6n * 100n * 10_000n));

  // Neues Video am 17.11.: Gesamtstand-Modus
  const r = addEntry(loaded, { mode: 'totals', followers: 150, likes: 1500 }, at('2026-11-17T10:00:00Z'));
  assert.equal(r.entry.followers, 50);
  assert.equal(r.entry.likes, 500);
  saveFile(r.file, p, at('2026-11-17T10:00:00Z'));
  loaded = loadFile(p)!;
  assert.equal(loaded.snapshot.population, '150');
  // 100 Menschen × 6 Tage + 50 Menschen × 1 Tag
  assert.equal(loaded.snapshot.consumedMl.drinking, String((600n + 50n) * 10_000n));
  assert.equal(loaded.snapshot.dailyMl, String(150n * 10_000n));
  assert.ok(fs.readdirSync(path.join(path.dirname(p), 'backups')).length >= 3);
});

test('Doppeleingabe mit gleicher Referenz wird verhindert', () => {
  let f = newFile('2026-11-12');
  f = addEntry(f, { mode: 'new', followers: 1, ref: 'video-01' }, at('2026-11-12T10:00:00Z')).file;
  assert.throws(() => addEntry(f, { mode: 'new', followers: 1, ref: 'video-01' }, at('2026-11-12T11:00:00Z')), /Doppeleingabe/);
});

test('Datum in der Zukunft oder vor dem Start wird abgelehnt', () => {
  const f = newFile('2026-11-12');
  assert.throws(() => addEntry(f, { mode: 'new', followers: 1, day: '2026-11-20' }, at('2026-11-12T10:00:00Z')), /Zukunft/);
  assert.throws(() => addEntry(f, { mode: 'new', followers: 1, day: '2026-11-01' }, at('2026-11-12T10:00:00Z')), /vor dem Start/);
});

test('Nachträglicher Eintrag (vergessenes Video) wird korrekt eingerechnet', () => {
  let f = newFile('2026-11-01');
  f = addEntry(f, { mode: 'new', followers: 10 }, at('2026-11-10T10:00:00Z')).file;              // 10.11.
  f = addEntry(f, { mode: 'new', followers: 5, day: '2026-11-05' }, at('2026-11-10T11:00:00Z')).file; // nachgetragen
  const saved = saveFile(f, tmp(), at('2026-11-10T12:00:00Z'));
  // 5 Menschen ab 5.11. (6 Tage) + 10 Menschen ab 10.11. (1 Tag) = 40 Menschentage
  assert.equal(saved.snapshot.consumedMl.drinking, String(40n * 10_000n));
});

test('Manipulierte Datei wird erkannt', () => {
  const p = tmp();
  let f = newFile('2026-11-12');
  f = addEntry(f, { mode: 'new', followers: 10 }, at('2026-11-12T10:00:00Z')).file;
  saveFile(f, p, at('2026-11-12T10:00:00Z'));
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  raw.snapshot.totalConsumedMl = '1';
  fs.writeFileSync(p, JSON.stringify(raw));
  assert.throws(() => loadFile(p), /passt nicht/);
});

test('Eintrag rückgängig machen', () => {
  let f = newFile('2026-11-12');
  const r = addEntry(f, { mode: 'new', followers: 10 }, at('2026-11-12T10:00:00Z'));
  f = removeEntry(r.file, r.entry.id);
  assert.equal(f.entries.length, 0);
});
