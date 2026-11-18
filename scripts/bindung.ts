/**
 * ZUSCHAUERBINDUNG-CHECK: prüft ein Drehbuch gegen unsere TikTok-Regeln, BEVOR gerendert wird.
 *
 *   npm run bindung -- --folge video-05
 *
 * Nutzt die echte Zeitleiste (output/<folge>-arbeit/zeitleiste.json), falls schon eine Aufnahme
 * verarbeitet wurde – sonst eine Schätzung der Sprechdauer.
 *
 * Regeln (Stand: Testphase 40–50 Sekunden):
 *  1. Länge 40–50 s
 *  2. Starkes visuelles Ereignis in der ersten Sekunde (harter Schnitt, Sticker, Ankunft …)
 *  3. In den ersten 3 s eine Frage oder ein Problem (Fragezeichen oder "hook": Satz)
 *  4. Spätestens alle 4 s etwas Neues im Bild (Kamera, Sticker, Ankunft, Wasser)
 *  5. Kurze Sätze (höchstens 12 Wörter)
 *  6. Überraschung ungefähr in der Mitte ("ueberraschung": true in einem Beat zwischen 35 % und 65 %)
 *  7. Cliffhanger am Ende (letzter Satz mit Fragezeichen oder "cliffhanger": true)
 *  8. Keine Regel-Erklärungen, die alle schon kennen (Warnung bei typischen Formulierungen)
 */
import fs from 'node:fs';
import path from 'node:path';
import { echteZahlen, folgenPfad, loadFolge } from '../server/folgen.ts';
import { buildTimeline, ersetze, plain, platzhalter } from '../src/video/script.ts';
import type { Timeline } from '../src/video/types.ts';

const a = process.argv.slice(2);
const name = a[a.indexOf('--folge') + 1];
if (!name) { console.error('Bitte --folge angeben'); process.exit(1); }
const folge = loadFolge(folgenPfad(name));
const z = echteZahlen(undefined, folge.seit, folge.stichtag);
const p = platzhalter(z.snapshot, z.seit);
const tlDatei = path.resolve(import.meta.dirname, '..', 'output', `${name}-arbeit`, 'zeitleiste.json');
// "Echt" nur, wenn die Zeitleiste aus der eigenen Aufnahme stammt (nicht aus einer Vorschau mit Ersatzstimme)
const aufnahme = folge.stimme?.typ === 'aufnahme' ? path.resolve(path.dirname(folgenPfad(name)), folge.stimme.datei) : null;
const echt = !!aufnahme && fs.existsSync(aufnahme) && fs.existsSync(tlDatei) && fs.statSync(tlDatei).mtimeMs > fs.statSync(aufnahme).mtimeMs
  && JSON.parse(fs.readFileSync(tlDatei, 'utf8')).beats?.length === folge.beats.length;
// Ohne Aufnahme: Sprechdauer im Tempo von Felix schätzen (Tag 4: 235 Wörter in 110 s ≈ 2,15 Wörter/s + Satzpausen)
const schaetzung = folge.beats.map((b) => { const t = plain(ersetze(b.sprache ?? b.text, p)); return t.split(/\s+/).length / 2.15 + (t.match(/[.!?…]/g)?.length ?? 1) * 0.25; });
const tl: Timeline = echt ? JSON.parse(fs.readFileSync(tlDatei, 'utf8')) : buildTimeline({ folge, ...z, sprechdauer: schaetzung, amStueck: folge.ton === 'nur-stimme' });

const fehler: string[] = [], hinweise: string[] = [];
const ok = (b: boolean, gut: string, schlecht: string, nurHinweis = false) => {
  if (b) console.log('  ✅ ' + gut); else { console.log((nurHinweis ? '  ⚠️  ' : '  ❌ ') + schlecht); (nurHinweis ? hinweise : fehler).push(schlecht); }
};

console.log(`\n🎯 ZUSCHAUERBINDUNG – ${folge.titel}  (${echt ? 'echte Aufnahme' : 'geschätzte Sprechdauer'})\n`);
// 1. Länge
ok(tl.dauer >= 40 && tl.dauer <= 50, `Länge ${tl.dauer.toFixed(1)} s (Ziel 40–50 s)`, `Länge ${tl.dauer.toFixed(1)} s – Ziel sind 40–50 s`);

// Zeitpunkte, an denen sich etwas sichtbar ändert
const wechsel: { t: number; was: string }[] = [];
tl.beats.forEach((b, i) => {
  const vor = tl.beats[i - 1];
  if (!vor || vor.kamera !== b.kamera) wechsel.push({ t: b.start, was: `Kamera ${b.kamera}` });
  if (!vor || JSON.stringify(vor.sticker) !== JSON.stringify(b.sticker)) if (b.sticker.length) wechsel.push({ t: b.start + 0.05, was: 'Sticker' });
  if (JSON.stringify(b.wasser.von) !== JSON.stringify(b.wasser.bis)) wechsel.push({ t: b.start + 0.2, was: 'Wasser sinkt' });
  if (b.kamera === (vor?.kamera ?? '') && b.vorschauEinwohner !== vor?.vorschauEinwohner) wechsel.push({ t: b.start, was: 'Menschenmenge' });
});
if (tl.ankunft) for (let k = 0; k < tl.ankunft.bis - tl.ankunft.von; k++) wechsel.push({ t: tl.ankunft.start + k * tl.ankunft.abstand + 0.75, was: 'Landung' });
wechsel.sort((x, y) => x.t - y.t);

// 2. Erste Sekunde
const ersterReiz = wechsel.find((w) => w.t > 0.01 && w.t <= 1) ?? (tl.ankunft && tl.ankunft.start <= 1 ? { t: tl.ankunft.start, was: 'Ankunft' } : undefined);
const harterStart = tl.beats[0].kamera !== 'space' && tl.beats[0].kamera !== 'intro';
ok(!!ersterReiz || (harterStart && tl.beats[0].sticker.length > 0), `Starker Einstieg in der 1. Sekunde${ersterReiz ? ` (${ersterReiz.was} bei ${ersterReiz.t.toFixed(1)} s)` : ''}`,
  'In der ersten Sekunde passiert nichts Auffälliges');

// 3. Frage/Problem in den ersten 3 s
const erste3 = folge.beats.filter((_, i) => tl.beats[i].start < 3).map((b) => plain(ersetze(b.text, p))).join(' ');
ok(/\?/.test(erste3) || folge.beats.some((b, i) => (b as { hook?: boolean }).hook && tl.beats[i].start < 3), 'Frage/Problem in den ersten 3 Sekunden',
  `Keine Frage/kein Problem in den ersten 3 s ("${erste3.slice(0, 60)}…")`);

// 4. Abstand zwischen visuellen Wechseln
const punkte = [0, ...wechsel.map((w) => w.t), tl.dauer];
let maxLuecke = 0, bei = 0;
for (let i = 1; i < punkte.length; i++) if (punkte[i] - punkte[i - 1] > maxLuecke) { maxLuecke = punkte[i] - punkte[i - 1]; bei = punkte[i - 1]; }
ok(maxLuecke <= 4.05, `Spätestens alle 4 s etwas Neues (längste Pause ${maxLuecke.toFixed(1)} s)`,
  `${maxLuecke.toFixed(1)} s ohne neues Bild ab ${bei.toFixed(1)} s – dort Kamera/Sticker wechseln`);

// 5. Kurze Sätze
const lang = folge.beats.map((b) => plain(ersetze(b.text, p))).flatMap((t) => t.split(/(?<=[.!?…])\s+/)).filter((s) => s.split(/\s+/).length > 12);
ok(!lang.length, 'Alle Sätze kurz (≤ 12 Wörter)', `Zu lange Sätze: ${lang.map((s) => `"${s}"`).join(', ')}`);

// 6. Überraschung in der Mitte
const ue = folge.beats.findIndex((b) => (b as { ueberraschung?: boolean }).ueberraschung);
const ueT = ue >= 0 ? tl.beats[ue].start / tl.dauer : -1;
ok(ueT >= 0.3 && ueT <= 0.7, `Überraschung bei ${(ueT * 100).toFixed(0)} % der Länge`, ue < 0 ? 'Keine Überraschung markiert ("ueberraschung": true)' : `Überraschung bei ${(ueT * 100).toFixed(0)} % – besser in der Mitte (35–65 %)`);

// 7. Cliffhanger
const letzte = folge.beats.at(-1)!;
ok(/\?/.test(letzte.text) || !!(letzte as { cliffhanger?: boolean }).cliffhanger, 'Cliffhanger am Ende', 'Kein Cliffhanger am Ende (Frage oder "cliffhanger": true)');

// 8. Bekannte Regeln nicht wiederholen
const regelSaetze = folge.beats.map((b) => plain(ersetze(b.text, p))).filter((t) => /jeder (neue )?follower (wird|ist|bringt)|1 follower = 1|wir trinken (das gesamte|die erde)|unsere mission|willkommen/i.test(t));
ok(!regelSaetze.length, 'Keine Wiederholung bekannter Regeln/Begrüßungen', `Bekanntes/Begrüßung: ${regelSaetze.map((s) => `"${s}"`).join(', ')}`, true);

console.log(`\n  Wörter gesamt: ${folge.beats.map((b) => plain(ersetze(b.text, p)).split(/\s+/).length).reduce((x, y) => x + y, 0)}` +
  `  ·  Bildwechsel: ${wechsel.length} (${(wechsel.length / tl.dauer * 10).toFixed(1)} pro 10 s)`);
console.log(fehler.length ? `\n❌ ${fehler.length} Regel(n) verletzt – bitte Drehbuch anpassen.\n` : `\n✅ Alle Regeln erfüllt${hinweise.length ? ` (${hinweise.length} Hinweis/e)` : ''}.\n`);
process.exit(fehler.length ? 1 : 0);
