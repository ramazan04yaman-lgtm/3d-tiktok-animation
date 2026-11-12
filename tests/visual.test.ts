import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../src/sim/config.ts';
import { type Hypsometry, seaLevelForDriedArea, seaLevelForRemaining, visualDrainFraction } from '../src/sim/visualScale.ts';

const T = DEFAULT_CONFIG.totalWaterMl;
const hyps = JSON.parse(fs.readFileSync(new URL('../public/assets/hypsometry.json', import.meta.url), 'utf8')) as Hypsometry & { ocean_volume_km3_etopo: number };

test('Visuelle Skala: 0 am Anfang, 1 wenn alles ausgetrunken, monoton steigend', () => {
  assert.equal(visualDrainFraction(0n, T), 0);
  assert.equal(visualDrainFraction(T, T), 1);
  let prev = 0;
  for (let e = 0n; e <= 24n; e++) {
    const v = visualDrainFraction(10n ** e, T);
    assert.ok(v >= prev, `nicht monoton bei 10^${e}`);
    prev = v;
  }
  assert.ok(visualDrainFraction(10n ** 9n /* 1 Mio L */, T) > 0.05, 'früh sichtbar');
});

test('Echter Modus ist ehrlich winzig', () => {
  assert.ok(visualDrainFraction(10n ** 9n, T, { mode: 'real', logStartLiters: 1, boost: 1 }) < 1e-12);
});

test('Hypsometrie aus ETOPO: Ozeanvolumen ≈ 1,33 Mrd. km³, Meeresspiegel sinkt mit Volumen', () => {
  assert.ok(Math.abs(hyps.ocean_volume_km3_etopo - 1.335e9) / 1.335e9 < 0.02);
  assert.equal(Math.round(seaLevelForRemaining(hyps, 1)), 0);
  const l90 = seaLevelForRemaining(hyps, 0.9);
  const l50 = seaLevelForRemaining(hyps, 0.5);
  assert.ok(l90 < 0 && l50 < l90 && seaLevelForRemaining(hyps, 0) <= -10000);
});

test('Flächen-Skala: 0 = heutige Küste, 1 = alles trocken, monoton', () => {
  assert.ok(Math.abs(seaLevelForDriedArea(hyps, 0)) < 1);
  assert.ok(seaLevelForDriedArea(hyps, 1) <= -10000);
  let prev = 1;
  for (let i = 0; i <= 20; i++) { const l = seaLevelForDriedArea(hyps, i / 20); assert.ok(l <= prev); prev = l; }
});
