import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv, defaults) {
  const out = { ...defaults };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = isNaN(Number(next)) ? next : Number(next);
      i++;
    }
  }
  return out;
}

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit', cwd: ROOT });
    let stdout = '';
    let stderr = '';
    p.stdout?.on('data', (d) => (stdout += d));
    p.stderr?.on('data', (d) => (stderr += d));
    p.on('close', (code) => (code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${cmd} exited ${code}\n${stderr}`))));
  });
}

/** Builds the app (unless --no-build) and serves dist/ with vite preview on a free port. */
export async function startServer({ build = true } = {}) {
  if (build || !fs.existsSync(path.join(ROOT, 'dist/index.html'))) {
    console.log('▸ building app …');
    await run('npx', ['vite', 'build', '--logLevel', 'warn']);
  }
  const server = await preview({ root: ROOT, preview: { port: 4173, strictPort: false, open: false }, logLevel: 'warn' });
  const url = server.resolvedUrls.local[0];
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) };
}

/** Launches headless Chromium with WebGL enabled (GPU if present, SwiftShader otherwise). */
export async function launchBrowser() {
  const opts = {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-vsync', '--hide-scrollbars', '--force-color-profile=srgb'],
  };
  if (process.env.MX_GPU) opts.args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default', '--hide-scrollbars', '--force-color-profile=srgb'];
  try {
    return await chromium.launch(opts);
  } catch (e) {
    if (fs.existsSync('/opt/pw-browsers/chromium')) return chromium.launch({ ...opts, executablePath: '/opt/pw-browsers/chromium' });
    throw e;
  }
}

/** Opens the project in render mode and waits until the RenderBridge reports ready. */
export async function openRenderPage(browser, baseUrl, project) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  await page.goto(`${baseUrl}?project=${project}&mode=render`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MX__?.ready === true, null, { timeout: 120000 });
  const info = await page.evaluate(() => {
    const { fps, duration, totalFrames, width, height } = window.__MX__;
    return { fps, duration, totalFrames, width, height };
  });
  return { page, info, problems };
}

/** Renders a single frame and returns the image buffer (full stage incl. HTML overlay). */
export async function captureFrame(page, frame, { format = 'jpeg', quality = 95 } = {}) {
  await page.evaluate((f) => window.__MX__.setFrame(f), frame);
  const el = await page.$('#mx-stage');
  return el.screenshot(format === 'png' ? { type: 'png' } : { type: 'jpeg', quality });
}

export async function ffprobe(file) {
  const { stdout } = await run(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames,codec_name,pix_fmt:format=duration', '-of', 'json', file],
    { quiet: true },
  );
  return JSON.parse(stdout);
}
