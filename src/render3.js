// V=v3 node src/render3.js [t...]   (no args: full render -> build/V/video.mp4)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { spawn, execFileSync } = require('child_process');
const V = process.env.V || 'v3'; const B = path.resolve('build', V); const ROOT = path.resolve('src'); const FPS = 30;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
(async () => {
  const TL = JSON.parse(fs.readFileSync(B + '/timeline.json', 'utf8'));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.route('http://local.test/**', r => {
    const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await p.addInitScript(tl => { window.TL = tl }, TL);
  await p.goto(`http://local.test/${V}/index.html`); await p.waitForFunction('window.ready', { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  fs.writeFileSync(B + '/sfx.json', JSON.stringify(await p.evaluate(() => window.SFX)));
  const args = process.argv.slice(2);
  if (args.length) { for (const a of args) { await p.evaluate(t => render(t), +a); await p.screenshot({ path: `${B}/prev_${a}.jpg`, type: 'jpeg', quality: 80 }); } await b.close(); return; }
  const N = Math.ceil(TL.total * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p', B + '/silent.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => render(t), i / FPS); const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 == 0) console.log(i, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('video done');
})();
