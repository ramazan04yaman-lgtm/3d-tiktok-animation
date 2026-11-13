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
import { zerschneide, zerschneideMitText } from '../server/aufnahme.ts';
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
const stimme = args.aufnahme ? { typ: 'aufnahme' as const, datei: args.aufnahme } : folge.stimme ?? { typ: 'piper' as const };
const audioFiles: (string | undefined)[] = [];
const dauer: (number | undefined)[] = [];
/** Text für die Stimme: ohne Emojis/Markierungen, Tausenderpunkte weg. */
const sprechText = (b: { text: string; sprache?: string }) => plain(ersetze(b.sprache ?? b.text, p))
  .replace(/(\d)\.(?=\d{3})/g, '$1').replace(/\p{Extended_Pictographic}/gu, '')
  .replace(/(\d) L\b/g, '$1 Liter').replace(/(\d) ml\b/g, '$1 Milliliter').replace(/\s+/g, ' ').trim();
let wortzeiten: ({ start: number; end: number }[] | undefined)[] | undefined;
let geschnitten: string[] | null = null;
if (stimme.typ === 'aufnahme') {
  const datei = path.resolve(args.aufnahme ? process.cwd() : path.dirname(folgePfad), stimme.datei);
  const genau = zerschneideMitText(datei, folge.beats.map((b) => sprechText(b)), work, path.join(root, 'tools'));
  if (genau) {
    geschnitten = genau.dateien;
    wortzeiten = genau.woerter;
    console.log(`✂️  Aufnahme wortgenau in ${geschnitten.length} Sätze geschnitten (Spracherkennung).`);
  } else {
    geschnitten = zerschneide(datei, folge.beats.length, work);
    console.log(`✂️  Aufnahme an den Pausen in ${geschnitten.length} Sätze geschnitten.`);
  }
}
if (stimme.typ === 'piper') {
  const modell = path.resolve(root, stimme.modell ?? 'tools/stimmen/de_DE-thorsten-high.onnx');
  if (!fs.existsSync(modell)) throw new Error(`Stimme fehlt: ${modell}\n   Bitte einmal "npm run stimme-laden" ausführen.`);
  const job = { modell, tempo: stimme.tempo ?? 0.95, sprecher: stimme.sprecher ?? null,
    rauschen: stimme.rauschen ?? 0.6, betonung: stimme.betonung ?? 0.75,
    saetze: folge.beats.map((b, i) => ({ text: sprechText(b), datei: path.join(work, `stimme-${String(i).padStart(2, '0')}.wav`) })) };
  // Aufnahmen wiederverwenden, wenn sich der Text nicht geändert hat (gleiche Länge -> fortsetzbar)
  const jobFile = path.join(work, 'tts.json');
  const neu = JSON.stringify(job, null, 2);
  const vorhanden = fs.existsSync(jobFile) && fs.readFileSync(jobFile, 'utf8') === neu && job.saetze.every((x) => fs.existsSync(x.datei));
  if (vorhanden) console.log('♻️  Sprachaufnahmen unverändert – werden wiederverwendet.');
  else {
    fs.writeFileSync(jobFile, neu);
    execFileSync('python3', [path.join(root, 'tools/tts_piper.py'), jobFile], { stdio: 'inherit' });
  }
}
/** Nachbearbeitung der KI-Stimme: schneller (ohne Tonhöhenänderung), Präsenz, Kompressor -> mehr Energie. */
function veredeln(roh: string): string {
  if (stimme.typ !== 'piper' || (!stimme.beschleunigen && !stimme.energie)) return roh;
  const out = roh.replace(/\.wav$/, '-fx.wav');
  const filter = [
    stimme.beschleunigen ? `atempo=${stimme.beschleunigen}` : '',
    stimme.energie ? 'highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3,equalizer=f=200:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2' : '',
    // Stille am Anfang/Ende kürzen -> flüssigeres Tempo
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse',
  ].filter(Boolean).join(',');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', roh, '-af', filter, '-ar', '44100', out]);
  return out;
}
folge.beats.forEach((b, i) => {
  let f: string | undefined;
  if (b.audio) f = path.resolve(path.dirname(folgePfad), b.audio);
  else if (geschnitten) f = geschnitten[i];
  else if (stimme.typ === 'piper') f = veredeln(path.join(work, `stimme-${String(i).padStart(2, '0')}.wav`));
  else if (stimme.typ === 'espeak') {
    f = path.join(work, `stimme-${String(i).padStart(2, '0')}.wav`);
    execFileSync('espeak-ng', ['-v', stimme.stimme ?? 'mb-de6', '-s', String(stimme.tempo ?? 165), '-w', f, sprechText(b)]);
  }
  audioFiles.push(f);
  dauer.push(f ? sec(f) : undefined);
});

// ---------- 2. Zeitleiste ----------
const timeline = buildTimeline({ folge, ...zahlen, sprechdauer: dauer, wortzeiten });
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

// Das Video wird in Abschnitten (je 10 s) gerendert. Fertige Abschnitte bleiben erhalten:
// Nach einem Abbruch rendert derselbe Befehl nur die fehlenden Abschnitte (fortsetzbar).
const silent = path.join(work, 'bild.mp4');
const SEG = FPS * 10;
const segKey = JSON.stringify({ timeline, W, H, FPS, leicht: !!args.leicht });
const keyFile = path.join(work, 'abschnitte.key');
if (args['neu-abschnitte']) {
  // Nur bestimmte Abschnitte neu rendern (z. B. nach einer kleinen Textkorrektur): --neu-abschnitte 6,7
  for (const n of args['neu-abschnitte'].split(',')) fs.rmSync(path.join(work, `abschnitt-${String(Number(n) - 1).padStart(3, '0')}.ok`), { force: true });
  fs.writeFileSync(keyFile, segKey);
} else if (!fs.existsSync(keyFile) || fs.readFileSync(keyFile, 'utf8') !== segKey) {
  for (const f of fs.readdirSync(work)) if (/^abschnitt-\d+\.(mp4|ok)$/.test(f)) fs.unlinkSync(path.join(work, f));
  fs.writeFileSync(keyFile, segKey);
}
const segCount = Math.ceil(frames / SEG);
const t0 = Date.now();
let gerendert = 0;
const offen = Array.from({ length: segCount }, (_, i) => i).filter((i) => !fs.existsSync(path.join(work, `abschnitt-${String(i).padStart(3, '0')}.ok`)));
if (offen.length < segCount) console.log(`⏩ ${segCount - offen.length} von ${segCount} Abschnitten sind schon fertig – mache weiter.`);
const offenBilder = offen.reduce((a, i) => a + Math.min(SEG, frames - i * SEG), 0);
for (const seg of offen) {
  const f0 = seg * SEG, f1 = Math.min(frames, f0 + SEG);
  // Aufwärmen: Kamera-Übergänge bis zum Abschnittsbeginn nachspielen (ohne Aufnahme)
  const tStart = f0 / FPS;
  await page.evaluate(([tl, s, demo]: [unknown, unknown, boolean]) => (window as any).__sim.loadStory(tl, s, demo), [timeline, zahlen.snapshot, !!args.demo]);
  for (const b of timeline.beats) {
    if (b.start > tStart) break;
    await page.evaluate((t: number) => (window as any).__sim.renderAt(t, 1 / 30), b.start + 0.0005);
    if (b.end <= tStart) await page.evaluate((t: number) => (window as any).__sim.renderAt(t, 1 / 30), b.end - 0.0005);
  }
  const name = path.join(work, `abschnitt-${String(seg).padStart(3, '0')}`);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), name + '.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = f0; i < f1; i++) {
    // Bild rendern + aufnehmen (bei Fehlern bis zu 3 Wiederholungen)
    let buf: Buffer | null = null;
    for (let versuch = 1; !buf; versuch++) {
      try {
        await page.evaluate(([t, dt]: [number, number]) => (window as any).__sim.renderAt(t, dt), [i / FPS, 1 / FPS]);
        buf = await page.screenshot({ type: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: W, height: H }, timeout: 120_000 });
      } catch (e) {
        if (versuch >= 3) throw e;
        console.warn(`\n⚠️  Bild ${i} fehlgeschlagen (${(e as Error).message.split('\n')[0]}) – neuer Versuch …`);
      }
    }
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    gerendert++;
    if (gerendert % FPS === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r🎞️  Bild ${i + 1}/${frames} · Abschnitt ${seg + 1}/${segCount} · noch ca. ${Math.round(el / gerendert * (offenBilder - gerendert))} s   `);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  fs.writeFileSync(name + '.ok', '');
}
// Abschnitte zusammenfügen
const liste = path.join(work, 'abschnitte.txt');
fs.writeFileSync(liste, Array.from({ length: segCount }, (_, i) => `file 'abschnitt-${String(i).padStart(3, '0')}.mp4'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', silent]);
await browser.close();
await server.close();
console.log('\n🔊 Ton mischen …');

// ---------- 4. Ton: Stimme + Musik (wird unter der Stimme leiser) + Effekte ----------
const plan = {
  dauer: total,
  abschnitte: timeline.musik.filter((m) => m.start < total - 0.5).map((m) => ({ start: m.start, typ: m.typ })),
  events: timeline.events.filter((e) => e.t < total),
  stimme: timeline.beats.map((b, i) => ({ t: b.start, datei: audioFiles[i] })).filter((v) => v.datei && v.t < total),
};
fs.writeFileSync(path.join(work, 'ton-plan.json'), JSON.stringify(plan, null, 2));
const [mus, sfx, voc] = ['musik', 'effekte', 'stimme'].map((n) => path.join(work, `${n}.wav`));
execFileSync('python3', [path.join(root, 'tools/sound.py'), path.join(work, 'ton-plan.json'), mus, sfx, voc], { stdio: 'inherit' });
const musikDatei = args.musik ? path.resolve(args.musik) : mus;
const mix = [
  `[0:a]aformat=channel_layouts=stereo,volume=1.0,asplit=2[v][vs]`,
  `[1:a]aformat=channel_layouts=stereo,volume=${args.musik ? 0.25 : 0.55}[m0]`,
  `[m0][vs]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=350[m]`,
  `[2:a]aformat=channel_layouts=stereo,volume=0.7[f]`,
  `[v][m][f]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:${total.toFixed(3)}[out]`,
].join(';');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', voc, ...(args.musik ? ['-stream_loop', '-1'] : []), '-i', musikDatei, '-i', sfx, '-i', silent,
  '-filter_complex', mix, '-map', '3:v', '-map', '[out]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-shortest', '-movflags', '+faststart', out]);
console.log(`✅ Fertig: ${out}  (${total.toFixed(1)} s, ${W}x${H}, ${FPS} fps)`);
console.log(`   Untertitel: ${out.replace(/\.mp4$/, '.srt')}`);
