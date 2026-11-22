// Profilbild aus dem Drachen-Modell (Kopf, leuchtende Augen), 1080x1080.
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output', 'profil'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/src/brick/index.html?tl=/videos/02-drache/build/timeline.json`);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  const variants = { a: ['#ff8a1a', [74, 46, 54, 17, 32.5, 0]], b: ['#1e88e5', [74, 46, 54, 17, 32.5, 0]], c: ['#ffd400', [86, 40, 12, 17, 32.5, 0]] };
  for (const [k, [bg, cam]] of Object.entries(variants)) {
    await page.evaluate(([bg, cam]) => {
      window.PROFILE = { bg, cam, fov: 30 };
      window.renderAt(window.TLGLOW || 49.85);
      for (const id of ['label', 'bar', 'cap', 'flash']) document.getElementById(id).style.display = 'none';
    }, [bg, cam]);
    const tmp = path.join(OUT, `tmp_${k}.png`); await page.screenshot({ path: tmp });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'crop=1080:1080:0:420', path.join(OUT, `profilbild_${k}.png`)]);
    fs.unlinkSync(tmp);
  }
  await browser.close(); server.close();
})();
