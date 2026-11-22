// Rendert ein Video frame-genau mit headless Chromium + Three.js und muxt mit ffmpeg.
// Usage: node tools/render.js videos/01-mond [--preview 0.5,2,5] [--fps 30] [--workers 3]
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), vdir = path.resolve(args[0]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('fps', 30), WORKERS = +opt('workers', 3), preview = opt('preview', null), PAGE = opt('page', 'src/index.html');
const build = path.join(vdir, 'build'), frames = path.join(vdir, 'frames');
const tlPath = path.join(build, 'timeline.json'), tl = fs.existsSync(tlPath) ? JSON.parse(fs.readFileSync(tlPath)) : null;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/${PAGE}` + (tl && !args.includes('--counts') ? `?tl=/${path.relative(ROOT, build)}/timeline.json` : '');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => console.error('PAGE ERROR', e.message));
    await page.goto(url); await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
    return page;
  };
  if (args.includes('--counts')) { // Steinzahlen je Bauteil für die Audio-Timeline
    const page = await open(); fs.mkdirSync(build, { recursive: true });
    fs.writeFileSync(path.join(build, 'parts.json'), JSON.stringify(await page.evaluate('window.PARTS'), null, 1));
    console.log(await page.evaluate('JSON.stringify(window.PARTS)')); await browser.close(); server.close(); return;
  }
  if (preview) {
    const page = await open(); fs.mkdirSync(path.join(build, 'preview'), { recursive: true });
    for (const t of preview.split(',').map(Number)) {
      await page.evaluate(t => window.renderAt(t), t);
      await page.screenshot({ path: path.join(build, 'preview', `t${t}.jpg`), type: 'jpeg', quality: 80 });
    }
    await browser.close(); server.close(); return;
  }
  fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const N = Math.ceil(tl.duration * FPS); let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const page = await open();
    for (let f = w; f < N; f += WORKERS) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      await page.screenshot({ path: path.join(frames, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
      if (++done % 60 === 0) console.log(`${done}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  await browser.close(); server.close();
  const out = path.join(ROOT, 'output', path.basename(vdir) + '.mp4');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const enc = (audio, file) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'), '-i', audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', '-shortest', file], { stdio: 'inherit' });
  enc(path.join(build, 'mix.wav'), out);
  enc(path.join(build, 'voice.wav'), out.replace('.mp4', '_nur-stimme.mp4'));
  console.log('Fertig:', out);
})();
