// Konzept-Standbilder für das Cabrio (Miami-Look).
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output', 'konzept-stadion'); fs.mkdirSync(OUT, { recursive: true });
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
  await page.goto(`http://127.0.0.1:${server.address().port}/src/brick/stadium.html`);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  const P = await page.evaluate('window.PARTS'), N = P.N, f = x => Math.round(x * N).toLocaleString('de-DE'), tot = N.toLocaleString('de-DE');
  const cum = {}; let c = 0; for (const p of P.order) { c += P.counts[p]; cum[p] = c / N; }
  const shots = [
    ['1-hook', { p: 0.003, cam: [110, 70, 46, 0, 0, 0], label: `STEIN 0 / ${tot}`, cap: 'ICH BAUE EIN <b>STADION</b>' }],
    ['2-rasen', { p: cum.lines, cam: [100, 64, 40, 0, 0, 0], label: `STEIN ${f(cum.lines)} / ${tot}`, cap: 'RASEN UND <b>LINIEN</b>' }],
    ['3-tore', { p: cum.goals, cam: [18, 9, 12, 36, 3, 0], label: `STEIN ${f(cum.goals)} / ${tot}`, cap: 'DIE <b>TORE</b>' }],
    ['4-tribuenen', { p: cum.stands, cam: [96, 96, 92, 0, 2, 0], label: `STEIN ${f(cum.stands)} / ${tot}`, cap: 'DIE <b>TRIBÜNEN</b>' }],
    ['5-fertig', { p: 1, cam: [112, 112, 104, 0, 0, 0], label: `STEIN ${tot} / ${tot}`, cap: '<b>FERTIG.</b>' }],
  ];
  for (const [name, s] of shots) {
    await page.evaluate(s => window.shot(s), s);
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 88 });
  }
  console.log(JSON.stringify(P));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...shots.flatMap(([n]) => ['-i', path.join(OUT, n + '.jpg')]),
    '-filter_complex', `${shots.map((_, i) => `[${i}]`).join('')}hstack=${shots.length},scale=2160:-1`, path.join(OUT, 'uebersicht.jpg')]);
  await browser.close(); server.close();
})();
