#!/usr/bin/env node
/**
 * Reproducible video export.
 *   1. build + serve the app
 *   2. Playwright opens N headless Chromium workers in render mode
 *   3. every frame is set explicitly via window.__MX__.setFrame(n) and screenshotted
 *   4. FFmpeg assembles the numbered frames into an H.264 MP4 (1080×1920, 30 fps, yuv420p)
 *
 * Usage: node scripts/render.mjs [--project kettle] [--workers 4] [--from 0] [--to 1799]
 *        [--every 1] [--out out/kettle] [--format jpeg|png] [--no-build] [--no-video]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ROOT, captureFrame, ffprobe, launchBrowser, openRenderPage, parseArgs, run, startServer } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  project: 'kettle',
  workers: Math.max(1, Math.min(4, os.cpus().length)),
  every: 1,
  format: 'jpeg',
  quality: 95,
  crf: 16,
});
const outDir = path.resolve(ROOT, args.out ?? `out/${args.project}`);
const framesDir = path.join(outDir, 'frames');
const ext = args.format === 'png' ? 'png' : 'jpg';

const t0 = Date.now();
const server = await startServer({ build: !args.noBuild });
console.log(`▸ serving ${server.url}`);

let info;
try {
  // probe timeline
  const probeBrowser = await launchBrowser();
  ({ info } = await openRenderPage(probeBrowser, server.url, args.project));
  await probeBrowser.close();
  const from = args.from ?? 0;
  const to = Math.min(args.to ?? info.totalFrames - 1, info.totalFrames - 1);
  const frames = [];
  for (let f = from; f <= to; f += args.every) frames.push(f);
  console.log(`▸ ${args.project}: ${info.width}×${info.height} @ ${info.fps} fps, ${info.duration}s → rendering ${frames.length} frames with ${args.workers} workers`);

  fs.mkdirSync(framesDir, { recursive: true });
  if (!args.keep) for (const f of fs.readdirSync(framesDir)) fs.rmSync(path.join(framesDir, f));

  let done = 0;
  const problems = [];
  const chunks = Array.from({ length: args.workers }, (_, w) => frames.filter((_, i) => i % args.workers === w));
  await Promise.all(
    chunks.map(async (chunk, w) => {
      if (!chunk.length) return;
      const browser = await launchBrowser();
      const { page, problems: p } = await openRenderPage(browser, server.url, args.project);
      for (const f of chunk) {
        const buf = await captureFrame(page, f, { format: args.format, quality: args.quality });
        // sequential numbering so ffmpeg sees a gap-free sequence even with --every
        const idx = frames.indexOf(f);
        fs.writeFileSync(path.join(framesDir, `frame_${String(idx).padStart(5, '0')}.${ext}`), buf);
        done++;
        if (done % 30 === 0 || done === frames.length) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r  ${done}/${frames.length} frames · ${(done / el).toFixed(2)} fps · ${el.toFixed(0)}s   `);
        }
      }
      problems.push(...p.map((x) => `[worker ${w}] ${x}`));
      await browser.close();
    }),
  );
  process.stdout.write('\n');
  if (problems.length) {
    console.error('✖ runtime problems during render:\n' + problems.join('\n'));
    process.exitCode = 1;
  }

  if (!args.noVideo) {
    const outFps = info.fps / args.every;
    const mp4 = path.join(outDir, `${args.project}${args.every > 1 ? `_preview_every${args.every}` : ''}.mp4`);
    console.log('▸ ffmpeg …');
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(outFps),
      '-i', path.join(framesDir, `frame_%05d.${ext}`),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf), '-pix_fmt', 'yuv420p',
      '-r', String(outFps), '-movflags', '+faststart',
      '-vf', `scale=${info.width}:${info.height}:flags=lanczos,setsar=1`,
      mp4,
    ]);
    const probe = await ffprobe(mp4);
    const s = probe.streams[0];
    console.log(`✔ ${path.relative(ROOT, mp4)}: ${s.width}×${s.height}, ${s.r_frame_rate} fps, ${s.nb_read_frames} frames, ${Number(probe.format.duration).toFixed(3)} s`);
  }
  console.log(`▸ total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} finally {
  await server.close();
}
