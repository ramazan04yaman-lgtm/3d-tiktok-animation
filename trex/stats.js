const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
(async () => { const srv = spawn('python3', ['-m', 'http.server', '8767'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
 const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8767/trex/index.html'); await p.waitForFunction('window.READY', null, { timeout: 120000 });
 console.log(JSON.stringify(await p.evaluate(() => window.STATS()))); await b.close(); srv.kill(); })();
