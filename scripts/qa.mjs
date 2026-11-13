#!/usr/bin/env node
/**
 * Quality assurance for a rendered video.
 *   - unit tests (timeline coverage, camera C¹-continuity, physics/track sanity)
 *   - live check: every scene renders without console errors / failed requests / missing assets
 *   - ffprobe: resolution, fps, frame count, duration
 *   - ffmpeg blackdetect: no black frames
 *   - ffmpeg scdet: no hard jumps between consecutive frames (would indicate broken camera moves)
 * Usage: node scripts/qa.mjs [--project kettle] [--video out/kettle/kettle.mp4] [--no-build]
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, captureFrame, ffprobe, launchBrowser, openRenderPage, parseArgs, run, startServer } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { project: 'kettle' });
const video = path.resolve(ROOT, args.video ?? `out/${args.project}/${args.project}.mp4`);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. unit tests
try {
  await run('npx', ['vitest', 'run', '--reporter=dot'], { quiet: true });
  check('unit tests (timeline, camera smoothness, physics)', true);
} catch (e) {
  check('unit tests', false, e.message.split('\n').slice(0, 20).join('\n'));
}

// 2. live render of one frame per scene (middle + boundaries)
const server = await startServer({ build: !args.noBuild });
const browser = await launchBrowser();
let info;
try {
  const r = await openRenderPage(browser, server.url, args.project);
  info = r.info;
  const probeFrames = [0, Math.round(info.totalFrames / 2), info.totalFrames - 1];
  for (let s = 0; s < 8; s++) probeFrames.push(Math.round(((s + 0.5) / 8) * info.totalFrames));
  const sizes = [];
  for (const f of probeFrames) sizes.push((await captureFrame(r.page, f, { format: 'jpeg', quality: 80 })).length);
  const errs = await r.page.evaluate(() => window.__MX_ERRORS__ ?? []);
  const problems = [...r.problems, ...errs];
  check('no runtime errors / missing models / missing textures', problems.length === 0, problems.join('; '));
  check('frames are not empty', Math.min(...sizes) > 40000, `smallest JPEG ${Math.min(...sizes)} bytes`);
} finally {
  await browser.close();
  await server.close();
}

// 3. video checks
if (!fs.existsSync(video)) {
  check('video exists', false, `${path.relative(ROOT, video)} not found — run npm run render first`);
} else {
  const p = await ffprobe(video);
  const s = p.streams[0];
  const dur = Number(p.format.duration);
  check('resolution 1080×1920 (9:16)', s.width === 1080 && s.height === 1920, `${s.width}×${s.height}`);
  check('30 fps', s.r_frame_rate === '30/1', s.r_frame_rate);
  check(`frame count = ${info.totalFrames}`, Number(s.nb_read_frames) === info.totalFrames, String(s.nb_read_frames));
  check('duration 60.000 s', Math.abs(dur - info.duration) < 0.02, `${dur.toFixed(3)} s`);
  check('H.264 yuv420p (TikTok compatible)', s.codec_name === 'h264' && s.pix_fmt === 'yuv420p', `${s.codec_name}/${s.pix_fmt}`);

  const { stderr: black } = await run('ffmpeg', ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.1:pix_th=0.05', '-an', '-f', 'null', '-'], { quiet: true });
  const blacks = black.split('\n').filter((l) => l.includes('black_start'));
  check('no black frames', blacks.length === 0, blacks.join(' '));

  // scdet scores every frame-to-frame change 0..100; a smooth animation stays low, a jump/cut spikes.
  const { stdout: scOut } = await run('sh', ['-c', `ffmpeg -hide_banner -loglevel error -i "${video}" -vf "scdet=threshold=0,metadata=print:file=-" -an -f null - `], { quiet: true });
  const scores = [...scOut.matchAll(/lavfi\.scd\.score=([\d.]+)/g)].map((m) => Number(m[1]));
  const max = Math.max(...scores);
  const worst = scores.indexOf(max);
  const LIMIT = 12;
  check(`no jumps / stutter (max frame-to-frame change < ${LIMIT})`, scores.length > 0 && max < LIMIT, `max ${max.toFixed(2)} at frame ${worst + 1} (t=${((worst + 1) / 30).toFixed(2)} s), mean ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)}`);
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n✖ QA failed (${failed.length}/${results.length})` : `\n✔ QA passed (${results.length} checks)`);
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, `out/qa-${args.project}.json`), JSON.stringify(results, null, 2));
process.exitCode = failed.length ? 1 : 0;
