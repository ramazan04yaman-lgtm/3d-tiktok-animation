/** Drehbücher (folgen/*.json) laden und mit echten oder Beispielzahlen verbinden. */
import fs from 'node:fs';
import path from 'node:path';
import { type Snapshot, toSnapshot } from '../src/sim/snapshot.ts';
import type { Folge } from '../src/video/types.ts';
import { sortEntries } from '../src/sim/simulation.ts';
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

/**
 * Echter Stand heute (+ Vergleichsstand "seit").
 * seit = Datum (JJJJ-MM-TT): Stand an diesem Tag.
 * seit = Referenz eines Eintrags (z. B. "video-01"): Stand direkt VOR diesem Eintrag
 *        -> so zeigt ein Video genau die Ergebnisse, die mit diesem Eintrag dazukamen.
 */
export function echteZahlen(file = DEFAULT_PATH, seit?: string, stichtag?: string): { snapshot: Snapshot; seit?: Snapshot; namen: string[] } {
  const alle = loadOrCreate(file);
  // Stichtag: Stand an einem festen Tag (damit Text, Aufnahme und Zahlen zusammenpassen, egal wann gerendert wird).
  // Spätere Einträge zählen dann noch nicht -> auch alte Folgen lassen sich jederzeit genau so neu erzeugen.
  const t = stichtag ?? today(alle);
  const f = { ...alle, entries: alle.entries.filter((e) => e.day <= t) };
  const snapshot = toSnapshot(computeState(f, t));
  // TikTok-Namen in Figuren-Reihenfolge (Nr. 1 = Figur 1)
  const namen: string[] = [];
  for (const n of f.einwohnerNamen ?? []) namen[n.nr - 1] = n.name;
  if (!seit) return { snapshot, namen };
  const ref = f.entries.find((e) => e.ref === seit);
  if (ref) {
    const vorher = sortEntries(f.entries);
    const entries = vorher.slice(0, vorher.indexOf(ref));
    return { snapshot, namen, seit: toSnapshot(computeState({ ...f, entries }, ref.day)) };
  }
  const entries = f.entries.filter((e) => e.day <= seit);
  return { snapshot, namen, seit: toSnapshot(computeState({ ...f, entries }, seit)) };
}

/** BEISPIELZAHLEN für Probevideos: Tag 1 – genau 1 Einwohner (wie beim echten Start). */
export function beispielZahlen(now = new Date(), follower = 1): { snapshot: Snapshot; seit: Snapshot; namen: string[] } {
  const t = today(undefined, now);
  const leer = newFile(t);
  const f = addEntry(leer, { mode: 'new', followers: follower, day: t }, now).file;
  return { snapshot: toSnapshot(computeState(f, t)), seit: toSnapshot(computeState(leer, t)), namen: [] };
}
