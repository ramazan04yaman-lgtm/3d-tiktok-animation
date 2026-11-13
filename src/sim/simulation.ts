/**
 * DAS HERZ DER SIMULATION
 *
 * Prinzip "Logbuch": Gespeichert wird eine Liste aller Eingaben (Einträge).
 * Der aktuelle Stand wird jedes Mal komplett aus diesem Logbuch nachgerechnet.
 * Vorteil: Kein Tag kann doppelt oder gar nicht berechnet werden, und keine
 * Aktivität wird doppelt gezählt – egal wie oft das Programm läuft.
 *
 * Regeln:
 *  - 1 neuer Follower = 1 neuer Mensch.
 *  - Jeder Mensch trinkt an JEDEM Kalendertag – auch an seinem Ankunftstag
 *    und auch an Tagen ohne neues Video.
 *  - Likes, Kommentare und Shares kosten einmalig Wasser.
 *  - MEILENSTEINE (siehe stufen.ts): Mit der gesamten Followerzahl steigen die Werte
 *    dauerhaft (Like +100 ml je 100 Follower, Kommentar +1 L je 250, Share +4 L je 500,
 *    Trinkmenge ×2 je 1.000 Follower bis max. 10.240 L ab 10.000 Followern;
 *    Grundwerte 10 ml / 0,5 L / 2 L / 10 L).
 *
 * Reihenfolge innerhalb eines Eintrags (festgelegt, damit alles eindeutig ist):
 *  1. Alle Tage bis einschließlich Eintragstag werden mit der BISHERIGEN Stufe verbucht
 *     (bereits verbuchtes Wasser ändert sich nie mehr).
 *  2. Die neuen Follower kommen dazu -> neue Meilensteine sind SOFORT aktiv.
 *  3. Die neuen Menschen trinken am Ankunftstag mit der neuen Stufe.
 *  4. Likes/Kommentare/Shares des Eintrags werden mit der neuen Stufe verbucht.
 *  Ab dem nächsten Tag trinken alle Einwohner mit der neuen Stufe.
 */
import type { SimConfig } from './config.ts';
import { DEFAULT_CONFIG } from './config.ts';
import { type NaechsterMeilenstein, type Stufe, meilensteineAktiv, naechsteMeilensteine, stufeFuer } from './stufen.ts';
import { type Day, addDays, assertDay, daysBetween } from './days.ts';

export interface Entry {
  /** Eindeutige ID (wird automatisch vergeben). */
  id: string;
  /** Kalendertag, an dem die Aktivität gezählt wird. */
  day: Day;
  /** Zeitpunkt der Eingabe (ISO). Sortiert Einträge am selben Tag. */
  createdAt: string;
  /** NEUE Follower/Likes/Kommentare/Shares (immer >= 0, ganze Zahlen). */
  followers: number;
  likes: number;
  comments: number;
  shares: number;
  /** Optional: eindeutige Referenz, z. B. "video-07". Verhindert Doppeleingaben. */
  ref?: string;
  /** Optional: vom Nutzer gemeldete Gesamtstände (Modus "Gesamtstand"). */
  reportedTotals?: Partial<Counts>;
  note?: string;
}

export interface Counts {
  followers: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface SimState {
  startDay: Day;
  /** Letzter Tag, dessen Trinkmenge bereits verbucht ist. */
  lastProcessedDay: Day;
  /** Anzahl berechneter Tage (inkl. Starttag). */
  daysProcessed: number;
  followers: bigint;
  population: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  consumed: {
    drinking: bigint;
    likes: bigint;
    comments: bigint;
    shares: bigint;
  };
  totalConsumedMl: bigint;
  remainingMl: bigint;
  totalWaterMl: bigint;
  /** Aktueller täglicher Trinkverbrauch aller Menschen (ml/Tag). */
  dailyMl: bigint;
  /** Höchster je gemeldeter Gesamtstand (für den Gesamtstand-Modus). */
  reportedHighWater: Counts;
  /** Tag, an dem das Wasser vollständig aufgebraucht war (falls passiert). */
  depletedOnDay: Day | null;
  /** Aktuell gültige Verbrauchsstufe. */
  stufe: Stufe;
  /** Nächste Meilensteine (der nächste zuerst). */
  naechste: NaechsterMeilenstein[];
  entryCount: number;
}

const ZERO = 0n;

function checkCount(n: unknown, what: string): number {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) {
    throw new Error(`${what} muss eine ganze Zahl >= 0 sein (bekommen: ${String(n)})`);
  }
  return n;
}

export function validateEntry(e: Entry): void {
  if (!e.id) throw new Error('Eintrag ohne ID');
  assertDay(e.day, 'Eintragsdatum');
  checkCount(e.followers, 'Follower');
  checkCount(e.likes, 'Likes');
  checkCount(e.comments, 'Kommentare');
  checkCount(e.shares, 'Shares');
}

/** Sortierung: nach Tag, dann Eingabezeitpunkt, dann ID (vollständig eindeutig). */
export function sortEntries(entries: readonly Entry[]): Entry[] {
  return [...entries].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 :
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 :
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Rechnet den Stand vom Starttag bis einschließlich `untilDay` nach.
 */
export function replay(
  startDay: Day,
  entries: readonly Entry[],
  untilDay: Day,
  config: SimConfig = DEFAULT_CONFIG,
): SimState {
  assertDay(startDay, 'Starttag');
  assertDay(untilDay, 'Berechnungstag');

  const ids = new Set<string>();
  const refs = new Set<string>();
  for (const e of entries) {
    validateEntry(e);
    if (ids.has(e.id)) throw new Error(`Doppelte Eintrags-ID: ${e.id}`);
    ids.add(e.id);
    if (e.ref) {
      if (refs.has(e.ref)) throw new Error(`Referenz doppelt vergeben: ${e.ref}`);
      refs.add(e.ref);
    }
    if (e.day < startDay) throw new Error(`Eintrag ${e.id} liegt vor dem Starttag ${startDay}`);
    if (e.day > untilDay) throw new Error(`Eintrag ${e.id} liegt in der Zukunft (${e.day} > ${untilDay})`);
  }

  const s: SimState = {
    startDay,
    lastProcessedDay: addDays(startDay, -1), // noch kein Tag verbucht
    daysProcessed: 0,
    followers: ZERO, population: ZERO, likes: ZERO, comments: ZERO, shares: ZERO,
    consumed: { drinking: ZERO, likes: ZERO, comments: ZERO, shares: ZERO },
    totalConsumedMl: ZERO,
    remainingMl: config.totalWaterMl,
    totalWaterMl: config.totalWaterMl,
    dailyMl: ZERO,
    reportedHighWater: { followers: 0, likes: 0, comments: 0, shares: 0 },
    depletedOnDay: null,
    entryCount: entries.length,
    stufe: stufeFuer(0n, config),
    naechste: [],
  };
  const stufeAm = (day: Day) => stufeFuer(s.followers, config, meilensteineAktiv(config, day));

  const total = () => s.consumed.drinking + s.consumed.likes + s.consumed.comments + s.consumed.shares;

  /** Prüft, ob das Wasser gerade ausgegangen ist (Tag des Versiegens merken). */
  const checkDepletion = (day: Day) => {
    if (s.depletedOnDay === null && total() >= config.totalWaterMl) s.depletedOnDay = day;
  };

  /** Verbucht einen Zeitraum mit gleicher Trinkmenge (Tage nach `from` bis einschließlich `to`). */
  const charge = (from: Day, to: Day) => {
    const n = daysBetween(from, to);
    if (n <= 0) return;
    const perDay = s.population * stufeAm(to).trinkMl;
    if (s.depletedOnDay === null && perDay > ZERO) {
      // An welchem dieser n Tage wird der Vorrat leer? (exakt, ohne Schleife)
      const left = config.totalWaterMl - total();
      if (left <= perDay * BigInt(n)) {
        const k = left <= ZERO ? 1n : (left + perDay - 1n) / perDay; // Aufrunden
        s.depletedOnDay = addDays(from, Number(k));
      }
    }
    s.consumed.drinking += perDay * BigInt(n);
    s.daysProcessed += n;
  };

  /** Verbucht alle Tage NACH lastProcessedDay bis einschließlich `day` – genau einmal. */
  const advanceTo = (day: Day) => {
    if (daysBetween(s.lastProcessedDay, day) <= 0) return;
    const ab = config.meilensteine.abTag;
    // Falls die Meilenstein-Regeln mitten im Zeitraum aktiviert wurden: in zwei Teile trennen
    if (ab !== null && ab > s.lastProcessedDay && ab <= day) {
      charge(s.lastProcessedDay, addDays(ab, -1));
      charge(addDays(ab, -1), day);
    } else charge(s.lastProcessedDay, day);
    s.lastProcessedDay = day;
  };

  for (const e of sortEntries(entries)) {
    advanceTo(e.day);
    const f = BigInt(e.followers);
    s.followers += f;
    s.population += f;                                  // 1 Follower = 1 Mensch
    const st = stufeAm(e.day);                          // neue Meilensteine sofort aktiv
    s.consumed.drinking += f * st.trinkMl;              // trinkt schon am Ankunftstag
    s.likes += BigInt(e.likes);
    s.comments += BigInt(e.comments);
    s.shares += BigInt(e.shares);
    s.consumed.likes += BigInt(e.likes) * st.likeMl;
    s.consumed.comments += BigInt(e.comments) * st.kommentarMl;
    s.consumed.shares += BigInt(e.shares) * st.shareMl;
    if (e.reportedTotals) {
      for (const k of ['followers', 'likes', 'comments', 'shares'] as const) {
        const v = e.reportedTotals[k];
        if (typeof v === 'number' && v > s.reportedHighWater[k]) s.reportedHighWater[k] = v;
      }
    }
    checkDepletion(e.day);
  }
  advanceTo(untilDay);

  s.totalConsumedMl = total();
  s.remainingMl = s.totalConsumedMl >= config.totalWaterMl ? ZERO : config.totalWaterMl - s.totalConsumedMl;
  s.stufe = stufeAm(addDays(s.lastProcessedDay, 1));
  s.naechste = naechsteMeilensteine(s.followers, config);
  s.dailyMl = s.population * s.stufe.trinkMl;
  return s;
}

/**
 * Modus "Gesamtstand": Du gibst die aktuellen Gesamtzahlen von TikTok ein,
 * das Programm berechnet daraus die NEUEN Zahlen seit der letzten Eingabe.
 * Gezählt wird nur, was über den bisher höchsten gemeldeten Stand hinausgeht –
 * so wird nach einem Rückgang (z. B. Entfolgen) nichts doppelt gezählt.
 */
export function deltasFromTotals(state: SimState, totals: Partial<Counts>): { deltas: Counts; warnings: string[] } {
  const deltas: Counts = { followers: 0, likes: 0, comments: 0, shares: 0 };
  const warnings: string[] = [];
  for (const k of ['followers', 'likes', 'comments', 'shares'] as const) {
    const v = totals[k];
    if (v === undefined) continue;
    checkCount(v, k);
    // Basis = das, was bereits gezählt wurde (auch aus "Neu"-Einträgen),
    // bzw. der höchste je gemeldete Gesamtstand – der größere Wert gewinnt.
    const counted = Number(state[k]);
    const prev = Math.max(state.reportedHighWater[k], counted);
    if (v < prev) warnings.push(`${k}: neuer Gesamtstand ${v} ist kleiner als bisher (${prev}) – es wird nichts abgezogen.`);
    deltas[k] = Math.max(0, v - prev);
  }
  return { deltas, warnings };
}

/** Wie viele Tage reicht das Wasser noch beim aktuellen Tagesverbrauch? (null = unendlich) */
export function daysUntilEmpty(state: SimState): bigint | null {
  if (state.remainingMl === ZERO) return 0n;
  if (state.dailyMl === ZERO) return null;
  return (state.remainingMl + state.dailyMl - 1n) / state.dailyMl;
}
