/** Drehbücher (folgen/*.json) laden und mit echten oder Beispielzahlen verbinden. */
import fs from 'node:fs';
import path from 'node:path';
import { type Snapshot, toSnapshot } from '../src/sim/snapshot.ts';
import type { Folge } from '../src/video/types.ts';
import { DEFAULT_PATH, addEntry, computeState, loadOrCreate, newFile, today } from './store.ts';

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

/** BEISPIELZAHLEN für Probevideos: Tag 1 – genau 1 Einwohner (wie beim echten Start). */
export function beispielZahlen(now = new Date(), follower = 1): { snapshot: Snapshot; seit: Snapshot } {
  const t = today(undefined, now);
  const leer = newFile(t);
  const f = addEntry(leer, { mode: 'new', followers: follower, day: t }, now).file;
  return { snapshot: toSnapshot(computeState(f, t)), seit: toSnapshot(computeState(leer, t)) };
}
