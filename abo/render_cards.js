// Rendert die Abo-/Like-Einblendungen als transparente PNGs
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
(async () => { const root = path.join(__dirname, '..'); const srv = spawn('python3', ['-m', 'http.server', '8766'], { cwd: root, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 600 } }); await p.goto('http://localhost:8766/abo/cards.html');
  await p.evaluate(() => document.fonts.load('900 50px M')); await p.waitForTimeout(300);
  for (const id of ['end', 'mid']) { await p.evaluate(i => { document.querySelectorAll('.card').forEach(c => c.style.display = c.id === i ? 'flex' : 'none'); }, id);
    await (await p.$('#' + id)).screenshot({ path: path.join(__dirname, id + '.png'), omitBackground: true }); }
  await b.close(); srv.kill(); })();
