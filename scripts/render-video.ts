/**
 * VIDEO-RENDERER: macht aus einem Drehbuch ein fertiges TikTok-Video (MP4, 9:16).
 *
 *   npm run video -- --folge folge-01                 (echte Zahlen aus data/simulation.json)
 *   npm run video -- --folge folge-01 --demo          (Probevideo mit Beispielzahlen)
 *   npm run video -- --folge folge-01 --aufnahme meine-stimme.m4a   (DEINE Stimme am Stück)
 *   Optionen: --leicht (schneller, für Rechner ohne Grafikkarte) --hoehe 1920 --fps 30 --seit 2026-11-12 --musik pfad.mp3 --bis 5 (nur die ersten 5 s)
 *
 * Ablauf: 1) Stimme je Satz erzeugen (oder eigene Aufnahme)  2) Zeitleiste berechnen
 *         3) Browser rendert Bild für Bild  4) FFmpeg: Bilder + Ton -> MP4
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer } from 'vite';
import { zerschneide } from '../server/aufnahme.ts';
import { beispielZahlen, echteZahlen, folgenPfad, loadFolge } from '../server/folgen.ts';
import { buildTimeline, ersetze, plain, platzhalter } from '../src/video/script.ts';

const argv = process.argv.slice(2);
const args: Record<string, string> = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) args[k] = 'ja'; else args[k] = argv[++i];
}
const name = args.folge ?? 'folge-01';
const H = Number(args.hoehe ?? 1920), W = Math.round(H * 9 / 16) & ~1, FPS = Number(args.fps ?? 30);
const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'output');
const work = path.join(outDir, `${name}-arbeit`);
fs.mkdirSync(work, { recursive: true });
const out = path.resolve(args.out ?? path.join(outDir, `${name}${args.demo ? '-probe' : ''}.mp4`));

const folgePfad = folgenPfad(name);
const folge = loadFolge(folgePfad);
const zahlen = args.demo ? beispielZahlen(new Date(), Number(args.demo) || 1) : echteZahlen(undefined, args.seit);
const p = platzhalter(zahlen.snapshot, zahlen.seit);
const sec = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// ---------- 1. Stimme ----------
console.log(`🎙️  Stimme für ${folge.beats.length} Sätze …`);
const stimme = args.aufnahme ? { typ: 'aufnahme' as const, datei: args.aufnahme } : folge.stimme ?? { typ: 'espeak' as const };
const audioFiles: (string | undefined)[] = [];
const dauer: (number | undefined)[] = [];
const geschnitten = stimme.typ === 'aufnahme'
  ? zerschneide(path.resolve(args.aufnahme ? process.cwd() : path.dirname(folgePfad), stimme.datei), folge.beats.length, work)
  : null;
if (geschnitten) console.log(`✂️  Deine Aufnahme wurde in ${geschnitten.length} Sätze geschnitten.`);
folge.beats.forEach((b, i) => {
  let f: string | undefined;
  if (b.audio) f = path.resolve(path.dirname(folgePfad), b.audio);
  else if (geschnitten) f = geschnitten[i];
  else if (stimme.typ === 'espeak') {
    const text = plain(ersetze(b.sprache ?? b.text, p)).replace(/(\d)\.(?=\d{3})/g, '$1');
    f = path.join(work, `stimme-${String(i).padStart(2, '0')}.wav`);
    execFileSync('espeak-ng', ['-v', stimme.stimme ?? 'mb-de6', '-s', String(stimme.tempo ?? 165), '-w', f, text]);
  }
  audioFiles.push(f);
  dauer.push(f ? sec(f) : undefined);
});

// ---------- 2. Zeitleiste ----------
const timeline = buildTimeline({ folge, ...zahlen, sprechdauer: dauer });
const total = Math.min(timeline.dauer, args.bis ? Number(args.bis) : Infinity);
const frames = Math.ceil(total * FPS);
fs.writeFileSync(path.join(work, 'zeitleiste.json'), JSON.stringify(timeline, null, 2));
// Untertitel-Datei (SRT) – praktisch zum Hochladen
const ts = (t: number) => new Date(t * 1000).toISOString().slice(11, 23).replace('.', ',');
fs.writeFileSync(out.replace(/\.mp4$/, '.srt'), timeline.captions.map((c, i) =>
  `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.words.map((w) => w.text).join(' ')}\n`).join('\n'));
console.log(`🧾 Zeitleiste: ${timeline.dauer.toFixed(1)} s, ${timeline.captions.length} Untertitel, ${frames} Bilder`);

// ---------- 3. Bilder rendern ----------
const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const addr = server.httpServer!.address() as { port: number };
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', (m: { type(): string; text(): string }) => { if (m.type() === 'error') console.error('[browser]', m.text()); });
await page.goto(`http://127.0.0.1:${addr.port}/?capture=${H}${args.leicht ? '&leicht=1' : ''}`);
await page.waitForFunction(() => (window as any).__sim?.ready(), null, { timeout: 300_000 });
await page.evaluate(([tl, s, demo]: [unknown, unknown, boolean]) => (window as any).__sim.loadStory(tl, s, demo), [timeline, zahlen.snapshot, !!args.demo]);

const silent = path.join(work, 'bild.mp4');
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const stage = page.locator('#stage');
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(([t, dt]: [number, number]) => (window as any).__sim.renderAt(t, dt), [i / FPS, 1 / FPS]);
  const buf: Buffer = await stage.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % FPS === 0) {
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(`\r🎞️  Bild ${i + 1}/${frames} · ${Math.round(el)} s · noch ca. ${Math.round(el / (i + 1) * (frames - i - 1))} s   `);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
await server.close();
console.log('\n🔊 Ton mischen …');

// ---------- 4. Ton: Stimme + "Plopp" bei Stickern (+ Musik) ----------
const inputs: string[] = [];
const filters: string[] = [];
let n = 0;
timeline.beats.forEach((b, i) => {
  const f = audioFiles[i];
  if (!f || b.start >= total) return;
  inputs.push('-i', f);
  filters.push(`[${n}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(b.start * 1000)}:all=1,volume=1.6[a${n}]`);
  n++;
});
const pop = path.join(work, 'plopp.wav');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', "aevalsrc='0.6*sin(2*PI*(500+3000*t)*t)*exp(-25*t)':s=44100:d=0.18", pop]);
for (const t of timeline.pops) {
  if (t >= total) continue;
  inputs.push('-i', pop);
  filters.push(`[${n}:a]aformat=channel_layouts=stereo,adelay=${Math.round(t * 1000)}:all=1,volume=0.5[a${n}]`);
  n++;
}
if (args.musik) {
  inputs.push('-stream_loop', '-1', '-i', path.resolve(args.musik));
  filters.push(`[${n}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.12[a${n}]`);
  n++;
}
const mix = `${filters.join(';')};${Array.from({ length: n }, (_, i) => `[a${i}]`).join('')}amix=inputs=${n}:normalize=0,atrim=0:${total.toFixed(3)}[out]`;
execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-i', silent, '-filter_complex', mix,
  '-map', `${n}:v`, '-map', '[out]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
console.log(`✅ Fertig: ${out}  (${total.toFixed(1)} s, ${W}x${H}, ${FPS} fps)`);
console.log(`   Untertitel: ${out.replace(/\.mp4$/, '.srt')}`);
