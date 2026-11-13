#!/usr/bin/env node
/** Render individual stills: node scripts/still.mjs --times 0,8,15 [--out out/stills] [--scale 0.5] */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, captureFrame, launchBrowser, openRenderPage, parseArgs, startServer } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { project: 'kettle', times: '0,8,15,22,32,41,48,54,59', out: 'out/stills' });
const outDir = path.resolve(ROOT, args.out);
fs.mkdirSync(outDir, { recursive: true });
const server = await startServer({ build: !args.noBuild });
const browser = await launchBrowser();
try {
  const { page, info, problems } = await openRenderPage(browser, server.url, args.project);
  for (const tt of String(args.times).split(',').map(Number)) {
    const f = Math.min(info.totalFrames - 1, Math.round(tt * info.fps));
    const t1 = Date.now();
    const buf = await captureFrame(page, f, { format: 'jpeg', quality: 90 });
    const file = path.join(outDir, `t${tt.toFixed(1).padStart(4, '0')}.jpg`);
    fs.writeFileSync(file, buf);
    console.log(`${path.relative(ROOT, file)}  (${Date.now() - t1} ms)`);
  }
  if (problems.length) console.error(problems.join('\n'));
} finally {
  await browser.close();
  await server.close();
}
