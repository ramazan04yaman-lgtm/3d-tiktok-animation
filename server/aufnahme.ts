/**
 * EIGENE STIMME: Eine Aufnahme am Stück (Handy-Sprachmemo, MP3, M4A, WAV …)
 * wird an den Sprechpausen automatisch in die einzelnen Sätze geschnitten.
 *
 * Tipp für die Aufnahme: Satz für Satz vorlesen und zwischen den Sätzen
 * jeweils etwa 1 Sekunde Pause machen.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export interface Pause { start: number; end: number }

function dauer(f: string): number {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
}

/** Findet alle Pausen (Stille) in der Aufnahme. */
export function findePausen(datei: string, schwelleDb = -35, minPause = 0.3): Pause[] {
  const log = execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-i', datei, '-af', `silencedetect=noise=${schwelleDb}dB:d=${minPause}`, '-f', 'null', '-'],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).toString();
  return parsePausen(log);
}

export function parsePausen(log: string): Pause[] {
  const res: Pause[] = [];
  let start: number | null = null;
  for (const line of log.split('\n')) {
    const s = line.match(/silence_start: ([\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Number(s[1]);
    if (e && start !== null) { res.push({ start, end: Number(e[1]) }); start = null; }
  }
  return res;
}

/**
 * Wählt die n-1 längsten Pausen (ohne Anfang/Ende) als Schnittstellen.
 * Liefert n Abschnitte [von, bis] in Sekunden.
 */
export function schnittpunkte(pausen: Pause[], gesamt: number, n: number): [number, number][] {
  const innen = pausen.filter((p) => p.start > 0.05 && p.end < gesamt - 0.05);
  if (innen.length < n - 1) {
    throw new Error(`In der Aufnahme wurden nur ${innen.length + 1} Sätze erkannt, das Drehbuch hat aber ${n}. ` +
      'Bitte zwischen den Sätzen etwas längere Pausen machen (ca. 1 Sekunde).');
  }
  const cuts = [...innen].sort((a, b) => (b.end - b.start) - (a.end - a.start)).slice(0, n - 1).sort((a, b) => a.start - b.start);
  const anfang = pausen.find((p) => p.start <= 0.05)?.end ?? 0;
  const ende = pausen.find((p) => p.end >= gesamt - 0.05)?.start ?? gesamt;
  const res: [number, number][] = [];
  let von = anfang;
  for (const c of cuts) { res.push([Math.max(0, von - 0.05), c.start + 0.08]); von = c.end; }
  res.push([Math.max(0, von - 0.05), Math.min(gesamt, ende + 0.08)]);
  return res;
}

/** Schneidet die Aufnahme in n Satz-Dateien (WAV) und gibt die Pfade zurück. */
export function zerschneide(datei: string, n: number, zielOrdner: string): string[] {
  const gesamt = dauer(datei);
  // Leicht empfindlichere Erkennung probieren, falls zu wenige Pausen gefunden werden
  let fehler: Error | null = null;
  for (const [db, d] of [[-35, 0.35], [-32, 0.3], [-30, 0.25], [-40, 0.3]] as const) {
    try {
      const teile = schnittpunkte(findePausen(datei, db, d), gesamt, n);
      return teile.map(([von, bis], i) => {
        const out = path.join(zielOrdner, `stimme-${String(i).padStart(2, '0')}.wav`);
        execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', von.toFixed(3), '-to', bis.toFixed(3), '-i', datei,
          '-af', 'highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '1', out]);
        return out;
      });
    } catch (e) { fehler = e as Error; }
  }
  throw fehler!;
}
