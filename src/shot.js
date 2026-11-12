// Renders style frames: node src/shot.js 1 2 3 4  -> build/style_N.jpg
// Serves src/ through Playwright request routing (ES modules need an http origin).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.route('http://local.test/**', r => {
    const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  for (const s of process.argv.slice(2)) {
    await p.goto('http://local.test/style/index.html?s=' + s);
    await p.waitForFunction('window.ready', { timeout: 60000 });
    await p.screenshot({ path: path.join(ROOT, '..', 'build', `style_${s}.jpg`), type: 'jpeg', quality: 90 });
  }
  await b.close();
})();
