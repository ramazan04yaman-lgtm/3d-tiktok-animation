// Konzept-Standbilder für das Klemmbaustein-Drachen-Format.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output', 'konzept-drache'); fs.mkdirSync(OUT, { recursive: true });
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
  await page.goto(`http://127.0.0.1:${server.address().port}/src/brick/index.html`);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  const N = await page.evaluate('window.BRICKS'); const n = x => Math.round(x * N).toLocaleString('de-DE');
  const tot = N.toLocaleString('de-DE');
  const shots = [
    ['1-hook', { p: 0.003, cam: [40, 26, 52, 0, 6, 0], label: `STEIN 0 / ${tot}`, cap: `ICH BAUE EINEN <b>DRACHEN</b> AUS ${tot} STEINEN` }],
    ['2-beine', { p: 0.10, cam: [34, 16, 40, 0, 5, 0], label: `STEIN ${n(.10)} / ${tot}`, cap: 'ZUERST DIE <b>BEINE</b>' }],
    ['3-koerper', { p: 0.42, cam: [48, 32, 46, 0, 11, 0], label: `STEIN ${n(.42)} / ${tot}`, cap: 'DANN DER <b>KÖRPER</b>' }],
    ['4-fluegel', { p: 0.78, cam: [60, 50, 14, 0, 18, 0], label: `STEIN ${n(.78)} / ${tot}`, cap: 'JETZT DIE <b>FLÜGEL</b>' }],
    ['5-fertig', { p: 1, glow: .2, cam: [74, 34, 50, 0, 20, 0], label: `STEIN ${tot} / ${tot}`, cap: '<b>FERTIG.</b>' }],
    ['6-feuer', { p: 1, glow: 1, fire: 1, cam: [66, 22, -48, 22, 24, 0], label: 'ER LEBT', cap: 'ABER DANN… <b>FEUER!</b>', bar: false }],
  ];
  for (const [name, s] of shots) {
    await page.evaluate(s => window.shot(s), s);
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 88 });
  }
  console.log('Steine:', N);
  await browser.close(); server.close();
})();
