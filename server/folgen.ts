/** Drehbücher (folgen/*.json) laden und mit echten oder Beispielzahlen verbinden. */
import fs from 'node:fs';
import path from 'node:path';
import { addDays } from '../src/sim/days.ts';
import { type Snapshot, toSnapshot } from '../src/sim/snapshot.ts';
import type { Folge } from '../src/video/types.ts';
import { DEFAULT_PATH, type SimFile, addEntry, computeState, loadOrCreate, newFile, today } from './store.ts';

export const FOLGEN_DIR = path.resolve(import.meta.dirname, '..', 'folgen');

export function listFolgen(): string[] {
  if (!fs.existsSync(FOLGEN_DIR)) return [];
  return fs.readdirSync(FOLGEN_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
}

export function folgenPfad(name: string): string {
  if (!/^[\w.-]+$/.test(name)) throw new Error('Ungültiger Folgen-Name');
  const p = path.join(FOLGEN_DIR, name.endsWith('.json') ? name : name + '.json');
  if (!fs.existsSync(p)) throw new Error(`Folge nicht gefunden: ${p}`);
  return p;
}

export function loadFolge(p: string): Folge {
  const f = JSON.parse(fs.readFileSync(p, 'utf8')) as Folge;
  if (!Array.isArray(f.beats) || !f.beats.length) throw new Error(`${p}: "beats" fehlt oder ist leer`);
  return f;
}

/** Echter Stand heute (+ Stand an einem früheren Tag, z. B. letztes Video). */
export function echteZahlen(file = DEFAULT_PATH, seitTag?: string): { snapshot: Snapshot; seit?: Snapshot } {
  const f = loadOrCreate(file);
  const t = today(f);
  const snapshot = toSnapshot(computeState(f, t));
  if (!seitTag) return { snapshot };
  const entries = f.entries.filter((e) => e.day <= seitTag);
  return { snapshot, seit: toSnapshot(computeState({ ...f, entries }, seitTag)) };
}

/** BEISPIELZAHLEN für Probevideos: 7 Tage, wachsende Community. */
export function beispielZahlen(now = new Date()): { snapshot: Snapshot; seit: Snapshot } {
  const t = today(undefined, now);
  let f: SimFile = newFile(addDays(t, -6));
  const plan = [[120, 2400, 80, 10], [340, 5200, 140, 35], [610, 9800, 260, 60], [900, 15000, 410, 95], [1450, 26000, 720, 160], [2100, 38000, 990, 230], [3500, 61000, 1500, 390]];
  plan.forEach(([fo, li, co, sh], i) => {
    const iso = addDays(t, i - 6) + 'T12:00:00Z';
    f = addEntry(f, { mode: 'totals', followers: fo, likes: li, comments: co, shares: sh, day: addDays(t, i - 6) }, new Date(Math.min(Date.parse(iso), now.getTime()))).file;
  });
  const seitTag = addDays(t, -1);
  return {
    snapshot: toSnapshot(computeState(f, t)),
    seit: toSnapshot(computeState({ ...f, entries: f.entries.filter((e) => e.day <= seitTag) }, seitTag)),
  };
}
