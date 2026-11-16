const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
const jobs = JSON.parse(process.argv[2]);
(async () => { const srv = spawn('python3', ['-m', 'http.server', '8768'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
 const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8768/trex/index.html?pr=0.5'); await p.waitForFunction('window.READY', null, { timeout: 120000 });
 let i = 0; for (const [vars, t] of jobs) { await p.evaluate(([v, t]) => { Object.assign(window, v); window.renderAt(t); }, [vars, t]); await p.screenshot({ path: `build/dbg_${String(i++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 80 }); }
 await b.close(); srv.kill(); })();
