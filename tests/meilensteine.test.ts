import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_CONFIG, ML_PER_LITER, configToJSON } from '../src/sim/config.ts';
import { type Entry, replay } from '../src/sim/simulation.ts';
import { naechsteMeilensteine, stufeFuer } from '../src/sim/stufen.ts';
import { addEntry, loadFile, newFile, saveFile } from '../server/store.ts';

const L = ML_PER_LITER;
const C = DEFAULT_CONFIG;
let n = 0;
const entry = (day: string, p: Partial<Entry> = {}): Entry => ({
  id: `m${++n}`, day, createdAt: `${day}T12:00:00.${String(n).padStart(3, '0')}Z`,
  followers: 0, likes: 0, comments: 0, shares: 0, ...p,
});
const st = (f: number) => stufeFuer(BigInt(f), C);

test('Like-Regel: 10 ml + 100 ml je 100 Follower (Beispiele aus der Aufgabe)', () => {
  for (const [f, ml] of [[0, 10], [99, 10], [100, 110], [199, 110], [200, 210], [300, 310], [399, 310], [1000, 1010]] as const) {
    assert.equal(st(f).likeMl, BigInt(ml), `${f} Follower`);
  }
});

test('Kommentar-Regel: 0,5 L + 1 L je 250 Follower', () => {
  for (const [f, ml] of [[0, 500], [249, 500], [250, 1500], [499, 1500], [500, 2500], [750, 3500], [999, 3500], [1000, 4500]] as const) {
    assert.equal(st(f).kommentarMl, BigInt(ml), `${f} Follower`);
  }
});

test('Share-Regel: 2 L + 4 L je 500 Follower', () => {
  for (const [f, l] of [[0, 2], [499, 2], [500, 6], [999, 6], [1000, 10], [1499, 10], [1500, 14], [2000, 18]] as const) {
    assert.equal(st(f).shareMl, BigInt(l) * L, `${f} Follower`);
  }
});

test('Trink-Regel: 10 L × 2 hoch (Anzahl 10.000er-Meilensteine) – Beispiele aus der Aufgabe', () => {
  for (const [f, l] of [[0, 10], [9_999, 10], [10_000, 20], [19_999, 20], [20_000, 40], [30_000, 80], [40_000, 160],
    [50_000, 320], [60_000, 640], [69_999, 640], [70_000, 1_280], [100_000, 10_240]] as const) {
    assert.equal(st(f).trinkMl, BigInt(l) * L, `${f} Follower`);
  }
  assert.equal(st(60_000).stufen.trinken, 6n);
});

test('Verdopplung gilt für die GESAMTE Bevölkerung (auch für alte Einwohner)', () => {
  // 9.999 Einwohner trinken je 10 L; am 3.1. kommt Follower Nr. 10.000 -> ab 4.1. trinken ALLE 20 L
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 9_999 }), entry('2026-01-03', { followers: 1 })], '2026-01-05');
  // 1.–3.1.: 9.999 × 10 L × 3 | 3.1.: Neuankömmling 20 L | 4.–5.1.: 10.000 × 20 L × 2
  assert.equal(s.consumed.drinking, (9_999n * 10n * 3n + 20n + 10_000n * 20n * 2n) * L);
  assert.equal(s.dailyMl, 10_000n * 20n * L);
});

test('Jeder neue Follower = neuer Einwohner mit der aktuellen Trinkmenge', () => {
  for (const [f, proKopf] of [[10_000, 20n], [20_000, 40n], [50_000, 320n], [60_000, 640n]] as const) {
    const s = replay('2026-01-01', [entry('2026-01-01', { followers: f })], '2026-01-01');
    assert.equal(s.population, BigInt(f));
    assert.equal(s.dailyMl, BigInt(f) * proKopf * L, `${f} Follower`);
  }
});

test('Große Zahlen exakt: 1 Mio. Follower -> 10 L × 2^100', () => {
  const s = st(1_000_000);
  assert.equal(s.trinkMl, 10n * L * 2n ** 100n);
  assert.equal(s.likeMl, 10n + 10_000n * 100n);
  assert.equal(s.kommentarMl, 500n + 4_000n * 1000n);
  assert.equal(s.shareMl, 2000n + 2_000n * 4000n);
});

test('Nächste Meilensteine', () => {
  const nm = naechsteMeilensteine(0n, C);
  assert.deepEqual(nm.map((x) => [x.regel, Number(x.follower)]), [['like', 100], ['kommentar', 250], ['share', 500], ['trinken', 10_000]]);
  assert.equal(nm[0].neuMl, 110n);
  assert.deepEqual(nm.map((x) => x.regel), ['like', 'kommentar', 'share', 'trinken']);
  assert.equal(nm[3].follower, 10_000n);
  const n2 = naechsteMeilensteine(9_999n, C);
  assert.equal(n2[0].follower, 10_000n);
  assert.ok(n2.some((x) => x.regel === 'trinken' && x.neuMl === 20n * L));
  // Verdopplung wiederholt sich bei jedem 10.000er-Meilenstein
  assert.equal(naechsteMeilensteine(10_000n, C).find((x) => x.regel === 'trinken')!.follower, 20_000n);
  assert.equal(naechsteMeilensteine(55_000n, C).find((x) => x.regel === 'trinken')!.neuMl, 640n * L);
});

test('Tagesverbrauch: Verdopplung ab dem Meilenstein, frühere Tage bleiben unverändert', () => {
  const e = [entry('2026-01-01', { followers: 9_999 }), entry('2026-01-04', { followers: 1 })];
  const s = replay('2026-01-01', e, '2026-01-06');
  // 1.–4.1.: 9.999 × 10 L (unverändert) | 4.1.: Neuankömmling 20 L | 5.–6.1.: 10.000 × 20 L
  assert.equal(s.consumed.drinking, (9_999n * 10n * 4n + 20n + 10_000n * 20n * 2n) * L);
  // Die ersten 4 Tage sind genau so viel wie ohne den späteren Eintrag
  assert.equal(replay('2026-01-01', e.slice(0, 1), '2026-01-04').consumed.drinking, 9_999n * 10n * 4n * L);
});

test('Likes/Kommentare/Shares werden mit der beim Eintrag gültigen Stufe verbucht – nie nachträglich', () => {
  const e = [
    entry('2026-01-01', { followers: 50, likes: 100, comments: 10, shares: 5 }),    // Stufe 0
    entry('2026-01-02', { followers: 60, likes: 100, comments: 10, shares: 5 }),    // jetzt 110 Follower -> Like-Stufe 1
    entry('2026-01-03', { followers: 400, likes: 100, comments: 10, shares: 5 }),   // 510 Follower
  ];
  const s = replay('2026-01-01', e, '2026-01-03');
  assert.equal(s.consumed.likes, 100n * 10n + 100n * 110n + 100n * 510n);
  assert.equal(s.consumed.comments, 10n * 500n + 10n * 500n + 10n * 2500n);
  assert.equal(s.consumed.shares, 5n * 2000n + 5n * 2000n + 5n * 6000n);
  // Erster Eintrag allein: unverändert
  const s1 = replay('2026-01-01', e.slice(0, 1), '2026-01-03');
  assert.equal(s1.consumed.likes, 1000n);
});

test('Mehrere Meilensteine in einem Eintrag werden alle aktiviert', () => {
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 25_000, likes: 1, comments: 1, shares: 1 })], '2026-01-02');
  assert.equal(s.stufe.trinkMl, 40n * L);                 // 2 Verdopplungen
  assert.equal(s.consumed.likes, 25_010n);                // 10 ml + 250 × 100 ml
  assert.equal(s.consumed.comments, 500n + 100n * 1000n); // 0,5 L + 100 × 1 L
  assert.equal(s.consumed.shares, 2000n + 50n * 4000n);   // 2 L + 50 × 4 L
  assert.equal(s.consumed.drinking, 25_000n * 40n * L * 2n);
});

test('Summen bleiben konsistent, Idempotenz', () => {
  const e = [entry('2026-03-01', { followers: 1200, likes: 5000, comments: 300, shares: 80 }), entry('2026-03-09', { followers: 900, likes: 7 })];
  const a = replay('2026-03-01', e, '2026-04-01');
  const b = replay('2026-03-01', [...e].reverse(), '2026-04-01');
  assert.equal(a.totalConsumedMl, b.totalConsumedMl);
  const c = a.consumed;
  assert.equal(a.totalConsumedMl, c.drinking + c.likes + c.comments + c.shares);
  assert.equal(a.totalConsumedMl + a.remainingMl, a.totalWaterMl);
});

test('Wasser leer: exakter Tag auch mit Meilensteinen (Mini-Erde)', () => {
  // Mini-Erde mit 3 Mio. Litern; 20.000 Menschen × 40 L = 800.000 L pro Tag -> leer am 4. Tag
  const cfg = { ...C, totalWaterMl: 3_000_000n * L };
  const s = replay('2026-01-01', [entry('2026-01-01', { followers: 20_000 })], '2026-01-10', cfg);
  assert.equal(s.depletedOnDay, '2026-01-04');
  assert.equal(s.remainingMl, 0n);
});

test('Alte Datei ohne Meilensteine: bisheriger Verbrauch bleibt exakt, Regeln ab dem Folgetag', () => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ms-')), 'simulation.json');
  let f = newFile('2026-11-01');
  f = addEntry(f, { mode: 'new', followers: 150, likes: 100 }, new Date('2026-11-01T10:00:00Z')).file;
  const saved = saveFile(f, p, new Date('2026-11-03T10:00:00Z'));
  // Datei so umbauen, als stamme sie aus der Zeit vor den Meilensteinen (alte Regeln: Like 10 ml)
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  delete raw.config.regelVersion; delete raw.config.meilensteine;
  raw.snapshot.consumedMl.likes = '1000';
  raw.snapshot.totalConsumedMl = String(150n * 10_000n * 3n + 1000n);
  fs.writeFileSync(p, JSON.stringify(raw));
  const loaded = loadFile(p)!;  // darf keinen Integritätsfehler werfen
  assert.equal(loaded.config.meilensteine!.abTag, '2026-11-04');
  // Ab dem 4.11. gelten die neuen Regeln (150 Follower: Like 110 ml, Trinken bleibt 10 L)
  const r = addEntry(loaded, { mode: 'new', likes: 10 }, new Date('2026-11-04T10:00:00Z'));
  const s2 = saveFile(r.file, p, new Date('2026-11-04T10:00:00Z'));
  assert.equal(s2.snapshot.consumedMl.likes, String(1000n + 10n * 110n));
  assert.ok(saved.snapshot.stufe.likeMl === '110');
});

test('Neue Dateien speichern die Regeln dauerhaft', () => {
  const j = configToJSON(C);
  assert.equal(j.regelVersion, 2);
    assert.equal(j.meilensteine!.likePlusMl, '100');
  assert.equal(j.meilensteine!.trinkSchritt, '10000');
  assert.equal(j.meilensteine!.trinkMaxStufen, null);
});
