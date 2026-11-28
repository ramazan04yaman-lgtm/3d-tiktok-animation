// usage: node render.js <outDir> <w> <fps> <worker> <nWorkers> [onlyTimes,comma]
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = __dirname, THREE_DIR = process.env.THREE_DIR;
const [outDir, w, fps, wi, nw, only] = process.argv.slice(2);
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = p.startsWith('/three/') ? path.join(THREE_DIR, p.slice(7)) : path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port; fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 400 } }); p.on('console', m => console.log('PAGE', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${port}/index.html?w=${w}`); await p.waitForFunction('window.READY', null, { timeout: 60000 });
  const dur = await p.evaluate('DUR');
  let frames;
  if (only) frames = only.split(',').map(Number).map(t => Math.round(t * fps));
  else { const N = Math.ceil(dur * fps); const per = Math.ceil(N / nw); frames = []; for (let i = wi * per; i < Math.min(N, (+wi + 1) * per); i++) frames.push(i); }
  const t0 = Date.now();
  for (const f of frames) { const d = await p.evaluate(t => renderFrame(t), f / fps); fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    if (f % 100 === 0) console.log(`w${wi} frame ${f} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  await b.close(); srv.close();
});
