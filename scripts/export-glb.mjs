#!/usr/bin/env node
/** Exports the procedural model of a project to public/models/<project>.glb (Blender-compatible). */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, launchBrowser, parseArgs, startServer } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { project: 'kettle' });
const server = await startServer({ build: !args.noBuild });
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(`${server.url}?project=${args.project}&mode=export-glb`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__MX_GLB__ === 'function', null, { timeout: 60000 });
  const b64 = await page.evaluate(() => window.__MX_GLB__());
  const out = path.join(ROOT, 'public/models', `${args.project}.glb`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(`✔ ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
} finally {
  await browser.close();
  await server.close();
}
