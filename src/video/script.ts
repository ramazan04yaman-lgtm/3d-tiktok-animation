/**
 * Macht aus einem Drehbuch (Folge) + echten Zahlen eine genaue Zeitleiste:
 * wann welcher Satz, welches Wort, welcher Sticker, welche Kamera.
 * Läuft im Browser (Vorschau) und in Node (Video-Renderer).
 */
import { ML_PER_LITER } from '../sim/config.ts';
import { formatDuration, groupDE } from '../sim/format.ts';
import type { Snapshot } from '../sim/snapshot.ts';
import { DEFAULT_CONFIG } from '../sim/config.ts';
import { percentExact } from '../sim/format.ts';
import { visualDrainFraction } from '../sim/visualScale.ts';
import type { Beat, Caption, CaptionWord, Effekt, Farbe, Folge, Musik, Sticker, Szenario, Timeline, TimelineBeat } from './types.ts';

const B = (s: string) => BigInt(s);

/** Große Zahl in Worten für die Stimme/Anzeige: 1.080.000.000 -> "1,08 Milliarden". */
export function zahlWorte(n: bigint): string {
  const units: [bigint, string, string][] = [
    [10n ** 24n, 'Quadrillion', 'Quadrillionen'], [10n ** 21n, 'Trilliarde', 'Trilliarden'], [10n ** 18n, 'Trillion', 'Trillionen'],
    [10n ** 15n, 'Billiarde', 'Billiarden'], [10n ** 12n, 'Billion', 'Billionen'], [10n ** 9n, 'Milliarde', 'Milliarden'], [10n ** 6n, 'Million', 'Millionen'],
  ];
  for (const [v, one, many] of units) {
    if (n >= v) {
      const x = Number((n * 100n) / v) / 100;
      return `${x.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${x === 1 ? one : many}`;
    }
  }
  return groupDE(n);
}

/** Alle Platzhalter, die im Drehbuch benutzt werden können. */
export function platzhalter(s: Snapshot, seit?: Snapshot): Record<string, string> {
  const liter = (ml: string) => zahlWorte(B(ml) / ML_PER_LITER);
  const years = s.daysUntilEmpty === null ? null : B(s.daysUntilEmpty) / 365n;
  return {
    tag: String(Math.max(1, s.daysProcessed)),
    einwohner: groupDE(B(s.population)),
    einwohner_text: B(s.population) === 1n ? 'ein Mensch' : `${groupDE(B(s.population))} Menschen`,
    follower: groupDE(B(s.followers)),
    neue_follower: groupDE(B(s.followers) - B(seit?.followers ?? '0')),
    pro_tag: liter(s.dailyMl),
    pro_tag_zahl: groupDE(B(s.dailyMl) / ML_PER_LITER),
    verbraucht: liter(s.totalConsumedMl),
    verbraucht_zahl: groupDE(B(s.totalConsumedMl) / ML_PER_LITER),
    likes: groupDE(B(s.likes)), kommentare: groupDE(B(s.comments)), shares: groupDE(B(s.shares)),
    reicht: years === null ? 'unendlich' : years < 1n ? formatDuration(B(s.daysUntilEmpty!)) : `${zahlWorte(years)} Jahre`,
    reicht_kurz: formatDuration(s.daysUntilEmpty === null ? null : B(s.daysUntilEmpty)),
  };
}

export function ersetze(text: string, p: Record<string, string>): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in p ? p[k] : m));
}

/** Text mit Hervorhebungen -> Wortliste mit Farben. */
export function parseWords(text: string): CaptionWord[] {
  const out: CaptionWord[] = [];
  const re = /\{(gelb|gruen|rot|blau|weiss):([^}]+)\}|\*([^*]+)\*|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) for (const w of m[2].split(/\s+/)) out.push({ text: w, farbe: m[1] as Farbe });
    else if (m[3]) for (const w of m[3].split(/\s+/)) out.push({ text: w, farbe: 'gelb' });
    else out.push({ text: m[4] });
  }
  // Reine Satzzeichen ("." "!" "...") an das vorige Wort hängen
  const res: CaptionWord[] = [];
  for (const w of out) {
    if (/^[.,!?:;…]+$/.test(w.text) && res.length) res[res.length - 1] = { ...res[res.length - 1], text: res[res.length - 1].text + w.text };
    else if (w.text.length) res.push(w);
  }
  return res;
}

/** Text ohne Markierungen (für die Stimme). */
export function plain(text: string): string {
  return parseWords(text).map((w) => w.text).join(' ');
}

/** Teilt Wörter in Untertitel-Stücke von 1–3 Wörtern (max. ~16 Zeichen). */
export function chunk(words: CaptionWord[]): CaptionWord[][] {
  const res: CaptionWord[][] = [];
  let cur: CaptionWord[] = [];
  let len = 0;
  for (const w of words) {
    const end = /[.!?:,]$/.test(w.text);
    if (cur.length && (len + w.text.length > 16 || cur.length >= 3)) { res.push(cur); cur = []; len = 0; }
    cur.push(w); len += w.text.length + 1;
    if (end) { res.push(cur); cur = []; len = 0; }
  }
  if (cur.length) res.push(cur);
  return res;
}

/** Geschätzte Sprechdauer (falls keine Audiodatei/Stimme). */
export function schaetzeDauer(text: string): number {
  const silben = (text.match(/[aeiouäöüy]+/gi) ?? []).length;
  return Math.max(0.8, silben * 0.2 + (text.match(/[.!?]/g)?.length ?? 0) * 0.15);
}

/**
 * Szenario mit den ECHTEN Regeln rechnen: zusätzlich zum heutigen Verbrauch trinken
 * `einwohner` Menschen `tage` Tage lang je 10 L. Liefert Zahlen + visuellen Wasserstand.
 */
export function rechneSzenario(s: Snapshot, sz: Szenario) {
  const total = B(s.totalWaterMl);
  const extra = BigInt(sz.einwohner) * DEFAULT_CONFIG.mlPerPersonPerDay * BigInt(sz.tage);
  const consumed = B(s.totalConsumedMl) + extra;
  const rest = consumed >= total ? 0n : total - consumed;
  const perDay = BigInt(sz.einwohner) * DEFAULT_CONFIG.mlPerPersonPerDay;
  const tageLeer = perDay > 0n ? (rest + perDay - 1n) / perDay : null;
  return {
    drain: visualDrainFraction(consumed, total),
    getrunken: zahlWorte(extra / ML_PER_LITER) + ' Liter',
    uebrig: percentExact(rest, total, 9) + ' %',
    reicht: tageLeer === null ? '∞' : formatDuration(tageLeer),
  };
}

const kurzZahl = (n: number) => n >= 1e9 ? `${(n / 1e9).toLocaleString('de-DE')} MRD.` : n >= 1e6 ? `${(n / 1e6).toLocaleString('de-DE')} MIO.` : groupDE(n);
const kurzDauer = (t: number) => t % 365 === 0 ? `${groupDE(t / 365)} ${t === 365 ? 'JAHR' : 'JAHRE'}` : `${groupDE(t)} TAGE`;

export interface BuildInput {
  folge: Folge;
  snapshot: Snapshot;
  seit?: Snapshot;
  /** Gemessene Länge der Sprachaufnahme je Beat (Sekunden); fehlt -> Schätzung. */
  sprechdauer?: (number | undefined)[];
}

export const PAUSE = 0.18;

export function buildTimeline({ folge, snapshot, seit, sprechdauer }: BuildInput): Timeline {
  const p = platzhalter(snapshot, seit);
  const beats: TimelineBeat[] = [];
  const captions: Caption[] = [];
  const events: Timeline['events'] = [];
  const musik: { start: number; typ: Musik }[] = [];
  const ev = (t: number, typ: Effekt, lautstaerke?: number) => events.push({ t, typ, ...(lautstaerke ? { lautstaerke } : {}) });
  let t = 0;
  let kamera = 'space';
  folge.beats.forEach((b: Beat, i) => {
    const text = ersetze(b.text, p);
    const words = parseWords(text);
    const sprech = sprechdauer?.[i] ?? schaetzeDauer(plain(ersetze(b.sprache ?? b.text, p)));
    const dauer = Math.max(b.min ?? 0, sprech + PAUSE);
    kamera = b.kamera ?? kamera;
    // Untertitel proportional zur Wortlänge über die Sprechzeit verteilen
    const chunks = b.untertitel === false ? [] : chunk(words);
    const weight = (c: CaptionWord[]) => c.reduce((a, w) => a + w.text.length + 2, 0);
    const total = chunks.reduce((a, c) => a + weight(c), 0) || 1;
    let ct = t;
    for (const c of chunks) {
      const d = (weight(c) / total) * sprech;
      captions.push({ start: ct, end: ct + d, words: c });
      ct += d;
    }
    // Szenario mit echten Regeln rechnen
    const sz = b.szenario ? rechneSzenario(snapshot, b.szenario) : null;
    let prevDrain: number | 'jetzt' = 'jetzt';
    if (beats.length) prevDrain = beats[beats.length - 1].wasser.bis;
    const conv = (v: number | 'jetzt' | 'szenario' | undefined, fallback: number | 'jetzt'): number | 'jetzt' =>
      v === undefined ? fallback : v === 'szenario' ? (sz ? sz.drain : 'jetzt') : v;
    const bis = conv(b.wasser?.bis, b.szenario ? (sz!.drain) : 'jetzt');
    const von = conv(b.wasser?.von, b.szenario ? prevDrain : bis);
    const sticker: Sticker[] = (b.sticker ?? []).map((s) => {
      const f = fillSticker(s, p);
      if (f.typ === 'szenario' && b.szenario && sz) {
        return { typ: 'szenario', zeilen: [
          `${kurzZahl(b.szenario.einwohner)} MENSCHEN · ${kurzDauer(b.szenario.tage)}`,
          `🥤 ${sz.getrunken.toUpperCase()}`,
          `💧 NOCH ${sz.uebrig}`,
          `⏳ REICHT NOCH ${sz.reicht.toUpperCase()}`,
        ] };
      }
      return f;
    });
    if (b.einwohner_vorschau && !sticker.some((s) => s.typ === 'schild' && /VORSCHAU/.test(s.text))) {
      sticker.push({ typ: 'schild', text: `👥 ${groupDE(b.einwohner_vorschau)} MENSCHEN`, farbe: 'weissrot', y: 22, drehung: -3 });
    }
    // Soundeffekte passend zu Kamera, Stickern und Zahlen
    if ((b.uebergang ?? 0) >= 1) ev(t, 'whoosh', 0.8);
    sticker.forEach((s, k) => {
      const at = t + 0.05 + k * 0.12;
      if (s.typ === 'zahl' && typeof s.bis !== 'string' || s.typ === 'zahl' && /^[\d.]+$/.test(String(s.bis))) {
        for (let q = 0; q < 14; q++) ev(at + 0.2 + q * 0.09, 'tick', 0.6);
        ev(at + 1.5, 'ding');
      } else if (s.typ === 'zahlen') {
        ev(at, 'whoosh', 0.6); for (let q = 0; q < 7; q++) ev(at + 0.15 + q * 0.12, 'pop', 0.6);
      } else ev(at, 'pop');
    });
    if (b.szenario) { ev(t + 0.1, 'drop', 0.8); ev(t + 0.6, 'drop', 0.6); }
    if (b.aktion === 'trinken' || kamera === 'einwohner1' || kamera === 'gruppe') ev(t + Math.min(1.2, dauer * 0.4), 'gulp', 0.7);
    for (const e of b.effekte ?? []) ev(t + e.t, e.typ);
    if (b.musik) musik.push({ start: t, typ: b.musik });
    beats.push({
      start: t, end: t + dauer, kamera, uebergang: b.uebergang ?? 0,
      sticker, wasser: { von, bis }, vorschauEinwohner: b.einwohner_vorschau,
      strohhalm: b.strohhalm ?? false, aktion: b.aktion, sprechen: { start: t, end: t + sprech },
    });
    t += dauer;
  });
  // letzter Untertitel bleibt bis zum Ende stehen
  if (captions.length) captions[captions.length - 1].end = t;
  if (!musik.length || musik[0].start > 0) musik.unshift({ start: 0, typ: 'ruhig' });
  return { titel: folge.titel, konto: folge.konto ?? '@deinkonto', dauer: t, beats, captions, events: events.sort((a, b) => a.t - b.t), musik };
}

function fillSticker(s: Sticker, p: Record<string, string>): Sticker {
  const r = (x: string) => ersetze(x, p);
  switch (s.typ) {
    case 'schild': return { ...s, text: r(s.text) };
    case 'zahl': return { ...s, label: r(s.label), bis: typeof s.bis === 'string' ? r(s.bis) : s.bis, von: typeof s.von === 'string' ? r(s.von) : s.von };
    case 'info': return { ...s, zeilen: s.zeilen.map(r) };
    case 'zeiger': return { ...s, text: r(s.text) };
    case 'namensschild': return { ...s, name: r(s.name), titel: r(s.titel) };
    case 'titel': return { ...s, zeilen: s.zeilen.map(r) };
    default: return s;
  }
}
