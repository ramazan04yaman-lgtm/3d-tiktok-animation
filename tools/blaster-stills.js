// Konzept-Standbilder für das Cabrio (Miami-Look).
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output', 'konzept-blaster'); fs.mkdirSync(OUT, { recursive: true });
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
  await page.goto(`http://127.0.0.1:${server.address().port}/src/brick/blaster.html`);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  const P = await page.evaluate('window.PARTS'), N = P.N, f = x => Math.round(x * N).toLocaleString('de-DE'), tot = N.toLocaleString('de-DE');
  const cum = {}; let c = 0; for (const p of P.order) { c += P.counts[p]; cum[p] = c / N; }
  const shots = [
    ['1-hook', { p: 0.004, cam: [70, 34, 96, 9, 8, 0], label: `STEIN 0 / ${tot}`, cap: 'ICH BAUE EINEN <b>SCI-FI-BLASTER</b>' }],
    ['2-griff', { p: cum.grip, cam: [62, 30, 80, 9, 12, 0], label: `STEIN ${f(cum.grip)} / ${tot}`, cap: 'ERST DER <b>GRIFF</b>' }],
    ['3-gehaeuse', { p: cum.body, cam: [118, 84, 104, 8, 20, 0], label: `STEIN ${f(cum.body)} / ${tot}`, cap: 'DANN DAS <b>GEHÄUSE</b>' }],
    ['4-fertig', { p: 1, cam: [142, 52, 96, 13, 19, 0], label: `STEIN ${tot} / ${tot}`, cap: '<b>FERTIG.</b>' }],
    ['5-laden', { p: 1, charge: 1, cam: [132, 34, 44, 18, 22, 0], label: 'LÄDT AUF…', cap: 'ENERGIE <b>100%</b>', bar: false }],
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
