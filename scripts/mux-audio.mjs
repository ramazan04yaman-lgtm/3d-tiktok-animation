#!/usr/bin/env node
/**
 * Places voice-over segments at exact video times and muxes them into the rendered video.
 * The video stream is copied untouched; audio is loudness-normalised for TikTok (-14 LUFS).
 * Usage: node scripts/mux-audio.mjs [--config audio/kettle-voice.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ffprobe, parseArgs, run } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { config: 'audio/kettle-voice.json' });
const cfg = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.config), 'utf8'));
const video = path.resolve(ROOT, cfg.video);
const out = path.resolve(ROOT, cfg.output);
const duration = Number((await ffprobe(video)).format.duration);

// overlap check
let prevEnd = -1;
for (const s of cfg.segments) {
  const len = (s.src[1] - s.src[0]) / (s.tempo ?? 1);
  if (s.at < prevEnd - 1e-6) throw new Error(`segment "${s.text}" starts at ${s.at}s but the previous one ends at ${prevEnd.toFixed(2)}s`);
  prevEnd = s.at + len;
  console.log(`${s.at.toFixed(2).padStart(6)}s – ${prevEnd.toFixed(2).padStart(6)}s  ${s.text}`);
}
if (prevEnd > duration) throw new Error(`voice ends at ${prevEnd.toFixed(2)}s, video is ${duration}s`);

const parts = cfg.segments.map((s, i) => {
  const tempo = s.tempo && s.tempo !== 1 ? `,atempo=${s.tempo}` : '';
  const ms = Math.round(s.at * 1000);
  // short fades avoid clicks at the cut points
  return `[1:a]atrim=${s.src[0]}:${s.src[1]},asetpts=PTS-STARTPTS${tempo},afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse,adelay=${ms}|${ms}[s${i}]`;
});
const mix = `${cfg.segments.map((_, i) => `[s${i}]`).join('')}amix=inputs=${cfg.segments.length}:normalize=0:dropout_transition=0,apad,atrim=0:${duration},loudnorm=I=${cfg.loudnessLUFS}:TP=-1.5:LRA=11,aresample=48000[a]`;

await run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', video, '-i', path.resolve(ROOT, cfg.source),
  '-filter_complex', [...parts, mix].join(';'),
  '-map', '0:v', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
  '-t', String(duration), '-movflags', '+faststart',
  out,
]);
const p = await ffprobe(out);
console.log(`✔ ${path.relative(ROOT, out)} — ${Number(p.format.duration).toFixed(3)} s`);
