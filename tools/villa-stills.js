// Villa-Standbilder: aktueller Follower-Stand (gesetzt = massiv, Rest = Glas-Vorschau).
// Usage: node tools/villa-stills.js <follower> [likes] [kommentare]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output', 'villa'); fs.mkdirSync(OUT, { recursive: true });
const [F = 0, L = 0, K = 0] = process.argv.slice(2).map(Number);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/src/brick/villa.html`);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  const P = await page.evaluate('window.PARTS'), N = P.N;
  const steine = Math.min(N, F * 10 + L + K * 5), fmt = n => n.toLocaleString('de-DE');
  const cap = `<span>${F} FOLLOWER</span> = <span style="color:#ffe02e">${fmt(F * 10)} STEINE</span>`;
  const shots = [
    ['stand', { placed: steine, falling: 25, cam: [74, 40, 112, 2, 9, 2], cap }],
    ['fertig', { placed: N, cam: [74, 40, 112, 2, 10, 2], label: `VILLA: ${fmt(N)} / ${fmt(N)} STEINE`, cap: 'SO SIEHT SIE <span style="color:#ffe02e">FERTIG</span> AUS' }],
  ];
  for (const [name, s] of shots) {
    await page.evaluate(s => window.shot(s), s);
    await page.screenshot({ path: path.join(OUT, `${name}_${F}.jpg`), type: 'jpeg', quality: 88 });
  }
  fs.writeFileSync(path.join(ROOT, 'videos', '05-villa', 'stand.json'), JSON.stringify({ follower: F, likes: L, kommentare: K, steine, gesamt: N, teile: P.counts }, null, 1));
  console.log(JSON.stringify({ N, steine, counts: P.counts }));
  await browser.close(); server.close();
})();
