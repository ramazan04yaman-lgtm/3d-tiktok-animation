/**
 * DAUERHAFTE SPEICHERUNG (Node.js)
 *
 * Alles liegt in einer lesbaren JSON-Datei: data/simulation.json
 *  - "entries": das Logbuch aller Eingaben (die eigentliche Wahrheit)
 *  - "snapshot": der daraus berechnete Stand (zum Nachlesen; wird bei jedem
 *    Speichern neu berechnet und beim Laden überprüft)
 *
 * Sicher speichern: erst in eine Temp-Datei schreiben, dann umbenennen
 * (atomar – bei Absturz bleibt immer eine gültige Datei übrig).
 * Vor jeder Änderung wird eine Sicherungskopie in data/backups/ abgelegt.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { type SimConfigJSON, configFromJSON, configToJSON, DEFAULT_CONFIG } from '../src/sim/config.ts';
import { type Day, addDays, assertDay, todayIn } from '../src/sim/days.ts';
import { type Counts, type Entry, KEYS, type SimState, deltasFromTotals, replay } from '../src/sim/simulation.ts';
import { type Snapshot, toSnapshot } from '../src/sim/snapshot.ts';

export const FORMAT = 'erde-austrinken/v1';

export interface SimFile {
  format: string;
  config: SimConfigJSON;
  startDay: Day;
  entries: Entry[];
  /** Letzter verarbeiteter Tag + Zeitpunkt (Info; berechnet wird immer aus dem Logbuch). */
  lastProcessedDay: Day;
  lastProcessedAt: string;
  snapshot: Snapshot;
  /**
   * TikTok-Namen der Einwohner (dauerhaft). Nr. 1 = Figur 1 usw. – jede Figur behält für immer
   * ihren Namen, ihr Aussehen und ihren Platz. Einwohner ohne bekannten Namen bleiben namenlos.
   */
  einwohnerNamen?: EinwohnerName[];
}

export interface EinwohnerName {
  /** Fortlaufende Nummer = Figur (1, 2, 3 …). Wird nie neu vergeben. */
  nr: number;
  /** TikTok-Name genau so, wie er eingegeben wurde (z. B. "@leonaprj"). */
  name: string;
  /** Wann der Name eingetragen wurde (ISO). */
  seit: string;
}

/** Gültiger TikTok-Name: @ + 1–30 Zeichen aus Buchstaben, Ziffern, Punkt, Unterstrich. */
export const NAME_REGEL = /^@[A-Za-z0-9._]{1,30}$/;

/**
 * Fügt TikTok-Namen hinzu (prüft alles, bevor etwas geändert wird):
 * - exakte Schreibweise wird übernommen (nur Leerzeichen am Rand werden entfernt, fehlendes @ ergänzt)
 * - kein Name doppelt (Groß-/Kleinschreibung egal)
 * - nicht mehr Namen als Follower (jeder Name gehört zu einem echten Einwohner)
 */
export function addNamen(file: SimFile, namen: string[], now = new Date()): SimFile {
  const liste = [...(file.einwohnerNamen ?? [])];
  const vorhanden = new Set(liste.map((n) => n.name.toLowerCase()));
  for (const roh of namen) {
    const t = roh.trim();
    const name = t.startsWith('@') ? t : '@' + t;
    if (!NAME_REGEL.test(name)) throw new Error(`Ungültiger TikTok-Name: "${roh}" (erlaubt: Buchstaben, Ziffern, Punkt, Unterstrich)`);
    if (vorhanden.has(name.toLowerCase())) throw new Error(`Name ${name} ist schon eingetragen – keine doppelte Figur.`);
    vorhanden.add(name.toLowerCase());
    liste.push({ nr: (liste.at(-1)?.nr ?? 0) + 1, name, seit: now.toISOString() });
  }
  const follower = computeState(file, today(file, now)).followers;
  if (BigInt(liste.length) > follower) {
    throw new Error(`${liste.length} Namen, aber nur ${follower} Follower/Einwohner. Bitte zuerst die Follower eintragen.`);
  }
  return { ...file, einwohnerNamen: liste };
}

/** Entfernt einen Namen (die Nummern der anderen bleiben unverändert). */
export function removeName(file: SimFile, name: string): SimFile {
  const liste = file.einwohnerNamen ?? [];
  if (!liste.some((n) => n.name.toLowerCase() === name.toLowerCase())) throw new Error(`Name ${name} nicht gefunden`);
  return { ...file, einwohnerNamen: liste.filter((n) => n.name.toLowerCase() !== name.toLowerCase()) };
}

export const DEFAULT_PATH = path.resolve(import.meta.dirname, '..', 'data', 'simulation.json');

export function newFile(startDay: Day): SimFile {
  const config = configToJSON(DEFAULT_CONFIG);
  const state = replay(startDay, [], startDay, DEFAULT_CONFIG);
  const now = new Date();
  return {
    format: FORMAT, config, startDay, entries: [],
    lastProcessedDay: state.lastProcessedDay, lastProcessedAt: now.toISOString(),
    snapshot: toSnapshot(state, now),
  };
}

export function today(file?: SimFile, now = new Date()): Day {
  return todayIn(file?.config.timeZone ?? DEFAULT_CONFIG.timeZone, now);
}

export function computeState(file: SimFile, untilDay: Day): SimState {
  const until = untilDay < file.startDay ? file.startDay : untilDay;
  return replay(file.startDay, file.entries, until, configFromJSON(file.config));
}

export function loadFile(p = DEFAULT_PATH): SimFile | null {
  if (!fs.existsSync(p)) return null;
  const file = JSON.parse(fs.readFileSync(p, 'utf8')) as SimFile;
  if (file.format !== FORMAT) throw new Error(`Unbekanntes Dateiformat in ${p}: ${file.format}`);
  // Ältere Datei ohne Meilenstein-Regeln: Regeln gelten ab dem Tag NACH dem letzten verbuchten Tag.
  // So bleibt bereits verbrauchtes Wasser exakt unverändert.
  if (!file.config.regelVersion) {
    const alt = configFromJSON(file.config);
    const ab = addDays(file.snapshot?.lastProcessedDay ?? file.startDay, 1);
    file.config = configToJSON({ ...alt, meilensteine: { ...alt.meilensteine, abTag: ab } });
  }
  // Integritätsprüfung: Snapshot muss zum Logbuch passen
  if (file.snapshot) {
    const check = computeState(file, file.snapshot.lastProcessedDay);
    if (check.totalConsumedMl.toString() !== file.snapshot.totalConsumedMl) {
      throw new Error('Gespeicherter Stand passt nicht zum Logbuch! Datei wurde vermutlich von Hand verändert. ' +
        'Bitte Sicherung aus data/backups/ prüfen.');
    }
  }
  return file;
}

export function loadOrCreate(p = DEFAULT_PATH, now = new Date()): SimFile {
  return loadFile(p) ?? newFile(today(undefined, now));
}

/** Verarbeitet alle Tage bis heute und speichert atomar (mit Sicherungskopie). */
export function saveFile(file: SimFile, p = DEFAULT_PATH, now = new Date()): SimFile {
  const day = today(file, now);
  const state = computeState(file, day);
  const out: SimFile = {
    ...file,
    lastProcessedDay: state.lastProcessedDay,
    lastProcessedAt: now.toISOString(),
    snapshot: toSnapshot(state, now),
  };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p)) backup(p, now);
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(out, null, 2) + '\n');
  fs.renameSync(tmp, p);
  return out;
}

function backup(p: string, now: Date, keep = 30): void {
  const dir = path.join(path.dirname(p), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(p, path.join(dir, `simulation-${stamp}.json`));
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('simulation-')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.unlinkSync(path.join(dir, f));
}

export interface EntryInput {
  mode: 'new' | 'totals';
  followers?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  /** Speicherungen (kein Wasserverbrauch). */
  saves?: number;
  day?: Day;
  ref?: string;
  note?: string;
}

/** Fügt einen Eintrag hinzu (prüft alles, bevor etwas geändert wird). */
export function addEntry(file: SimFile, input: EntryInput, now = new Date()): { file: SimFile; entry: Entry; warnings: string[] } {
  const t = today(file, now);
  const day = input.day ? assertDay(input.day) : t;
  if (day > t) throw new Error(`Datum ${day} liegt in der Zukunft (heute ist ${t}).`);
  if (day < file.startDay) throw new Error(`Datum ${day} liegt vor dem Start der Simulation (${file.startDay}).`);
  if (input.ref && file.entries.some((e) => e.ref === input.ref)) {
    throw new Error(`Referenz "${input.ref}" wurde schon eingetragen – Doppeleingabe verhindert.`);
  }
  const counts: Counts = {
    followers: input.followers ?? 0, likes: input.likes ?? 0,
    comments: input.comments ?? 0, shares: input.shares ?? 0, saves: input.saves ?? 0,
  };
  let warnings: string[] = [];
  let deltas = counts;
  let reportedTotals: Partial<Counts> | undefined;
  if (input.mode === 'totals') {
    const current = computeState(file, t);
    reportedTotals = {};
    for (const k of KEYS) {
      if (input[k] !== undefined) reportedTotals[k] = input[k];
    }
    ({ deltas, warnings } = deltasFromTotals(current, reportedTotals));
  }
  const entry: Entry = {
    id: randomUUID(), day, createdAt: now.toISOString(), ...deltas,
    ...(input.ref ? { ref: input.ref } : {}),
    ...(reportedTotals ? { reportedTotals } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
  const next: SimFile = { ...file, entries: [...file.entries, entry] };
  computeState(next, t); // wirft einen Fehler, falls etwas nicht stimmt
  return { file: next, entry, warnings };
}

export function removeEntry(file: SimFile, id: string): SimFile {
  if (!file.entries.some((e) => e.id === id)) throw new Error(`Eintrag ${id} nicht gefunden`);
  return { ...file, entries: file.entries.filter((e) => e.id !== id) };
}
