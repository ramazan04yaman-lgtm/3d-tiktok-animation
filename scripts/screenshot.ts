/**
 * Erstellt Vorschaubilder (PNG, 9:16) der Simulation mit einem unsichtbaren Browser.
 * Voraussetzung: "npm run dev" läuft (Standard: http://localhost:5173).
 *
 *   npm run screenshot -- --shot space --drain 0 --out output/space.png [--height 1920] [--time 5]
 *
 * --drain: Vorschau-Austrocknung 0..1 (weglassen = echter gespeicherter Stand)
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const args: Record<string, string> = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
const url = args.url ?? 'http://localhost:5173/';
const height = Number(args.height ?? 1920);
const out = path.resolve(args.out ?? `output/${args.shot ?? 'space'}.png`);

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Math.round(height * 9 / 16), height }, deviceScaleFactor: 1 });
page.on('console', (m: { type(): string; text(): string }) => { if (m.type() === 'error') console.error('[browser]', m.text()); });
await page.goto(`${url}?capture=${height}&shot=${args.shot ?? 'space'}`);
await page.waitForFunction(() => (window as any).__sim?.ready(), null, { timeout: 180_000 });
await page.evaluate(([drain, t]: [string | undefined, number]) => {
  const sim = (window as any).__sim;
  if (drain !== undefined) sim.setPreview(Number(drain), true);
  if (drain === 'real') sim.setPreview(null, true);
  sim.renderAt(t);
}, [args.drain, Number(args.time ?? 4)] as [string | undefined, number]);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.locator('#stage').screenshot({ path: out });
await browser.close();
console.log('Gespeichert:', out);
