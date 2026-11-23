// usage: THREE_DIR=... node branding/render_avatar.js  -> branding/profilbild_*.png
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..'), THREE_DIR = process.env.THREE_DIR;
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = p.startsWith('/three/') ? path.join(THREE_DIR, p.slice(7)) : path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); s.end(d); }); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message)); await p.goto(`http://localhost:${srv.address().port}/branding/avatar.html`); await p.waitForFunction('window.READY', null, { timeout: 60000 });
  for (const n of ['erzaehler', 'baer', 'trio']) { const d = await p.evaluate(n => shot(n), n); fs.writeFileSync(path.join(__dirname, `profilbild_${n}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log(n); }
  await b.close(); srv.close(); });
