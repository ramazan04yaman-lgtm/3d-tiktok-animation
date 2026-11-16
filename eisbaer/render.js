// Rendert Frames mit Headless-Chromium (mehrere Worker parallel)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const FPS = 30; const args = process.argv.slice(2);
const OUT = path.join(__dirname, 'build/frames'); fs.mkdirSync(OUT, { recursive: true });
const TL = JSON.parse(fs.readFileSync(path.join(__dirname, 'build/timeline.json')));
const test = args[0] === 'test';
const frames = test ? args.slice(1).map(Number).map(t => Math.round(t * FPS)) : [...Array(Math.ceil(TL.duration * FPS)).keys()];
const WORKERS = Number(process.env.WORKERS || (test ? 1 : 4));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8765'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const t0 = Date.now(); let done = 0;
  await Promise.all([...Array(WORKERS).keys()].map(async w => {
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on('console', m => { if (m.type() !== 'log' || test) console.log('[page]', m.text()); });
    p.on('pageerror', e => console.log('[err]', e.message));
    await p.goto('http://localhost:8765/eisbaer/index.html?pr=' + (process.env.PR || '0.6')); await p.waitForFunction('window.READY', null, { timeout: 120000 });
    for (let j = w; j < frames.length; j += WORKERS) {
      const f = frames[j]; await p.evaluate(t => window.renderAt(t), f / FPS);
      await p.screenshot({ path: `${OUT}/${test ? 'test_' : ''}${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
      if (++done % 60 === 0) console.log(done, '/', frames.length, ((Date.now() - t0) / done).toFixed(0), 'ms/frame');
    }
    await b.close();
  }));
  srv.kill(); console.log('fertig', (Date.now() - t0) / 1000, 's');
})();
