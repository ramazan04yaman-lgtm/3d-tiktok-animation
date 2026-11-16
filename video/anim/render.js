// Rendert das Video Frame für Frame in Chromium (parallel) und kodiert Teilstücke mit ffmpeg.
// node render.js <timing.json> <outdir> [workers]
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { SCENES } = require('./scenes');
const { clamp, ease, easeOut, f1, lerp, INK } = require('./lib');

const FPS = 30;
const CAPY = { behind: 930 };

// Spezielle Kamera für den Twist: Snap-Zoom auf die Gestalt
SCENES.behind.camera = (t, d, cue) => {
  const st = cue('stinger') ?? 0.1, k = t - st;
  if (k < 0) return { z: 1.12, cx: 540, cy: 1250 };
  const a = easeOut(k / 0.35);
  return { z: lerp(1.12, 1.5, a) + k * 0.02, cx: 540, cy: lerp(1250, 900, a) };
};

function camFor(block, sc, t) {
  const d = block.t1 - block.t0;
  const cue = n => (block.cues[n] ?? null);
  if (sc.camera) return sc.camera(t, d, cue);
  const n = sc.single ? 1 : Math.max(1, Math.round(d / 1.7));
  const k = Math.min(n - 1, Math.floor(t / (d / n)));
  const u = (t - k * d / n) / (d / n);
  const c = sc.cams[k % sc.cams.length];
  const punch = 1 + 0.035 * (1 - easeOut(u * (d / n) / 0.25));
  return { z: c.z * (1 + 0.06 * ease(u)) * (k > 0 || block.idx > 0 ? punch : 1), cx: c.cx + 15 * u, cy: c.cy - 10 * u };
}

function sceneLayer(block, T, op) {
  const sc = SCENES[block.scene];
  const t = T - block.t0, d = block.t1 - block.t0;
  const cue = n => (block.cues[n] ?? null);
  let { z, cx, cy } = camFor(block, sc, t);
  z = Math.max(1, z);
  cx = clamp(cx, 540 / z, 1080 - 540 / z);
  cy = clamp(cy, 960 / z, 1920 - 960 / z);
  let sx = 0, sy = 0;
  const amp = sc.shake || 0;
  if (amp) { sx = Math.sin(T * 41) * amp + Math.sin(T * 17) * amp; sy = Math.cos(T * 37) * amp; }
  if (block.scene === 'behind') {
    const st = cue('stinger') ?? 0.1, k = t - st;
    if (k > 0 && k < 0.6) { const a = 18 * (1 - k / 0.6); sx = Math.sin(T * 70) * a; sy = Math.cos(T * 55) * a; }
  }
  return `<g opacity="${f1(op * 100) / 100}"><g transform="translate(${f1(540 + sx)},${f1(960 + sy)}) scale(${(z).toFixed(4)}) translate(${f1(-cx)},${f1(-cy)})">${sc.draw(t, d, cue)}</g></g>`;
}

const DEFS = `<defs>
<filter id="blurL" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="40"/></filter>
<filter id="blurM" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="blurS" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10"/></filter>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6d0" stop-opacity="0.6"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>
<linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4da8"/><stop offset="1" stop-color="#7a3fa0"/></linearGradient>
<radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></radialGradient>
</defs>`;

function overlay(tl, T, blk) {
  let g = `<rect width="1080" height="1920" fill="url(#vig)"/>`;
  // Chip oben (Tag / Uhrzeit)
  if (blk.chip) {
    const a = easeOut((T - blk.chipStart) / 0.3);
    const night = /0[0-4]:|TAG 3$|TAG 7$/.test(blk.chip);
    g += `<g id="chip" opacity="${f1(a * 100) / 100}" transform="translate(540,${f1(250 - (1 - a) * 20)})"><rect id="chipbg" rx="30" fill="#14142a" opacity="0.85" stroke="#fff" stroke-opacity="0.25" stroke-width="2"/>`;
    g += `<text id="chiptxt" x="0" y="13" font-family="Inter" font-size="38" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="2"><tspan fill="${night ? '#9fb8ff' : '#ffd23f'}">${night ? '☾' : '☀'} </tspan>${blk.chip}</text></g>`;
  }
  // Untertitel-Phrase
  const ph = tl.phrases.find(p => T >= p.t0 && T < p.t1);
  if (ph) {
    const a = easeOut((T - ph.t0) / 0.12);
    const s = 0.88 + 0.12 * a;
    const tsp = ph.words.map(w => `<tspan fill="${w.c === 'r' ? '#ff4d4d' : w.c === 'y' ? '#ffd23f' : '#ffffff'}">${w.w}</tspan>`).join(' ');
    g += `<g id="cap" transform="translate(540,${CAPY[blk.scene] || 1470}) scale(${s.toFixed(3)})" opacity="${f1(Math.min(1, a * 1.5) * 100) / 100}"><rect id="capbg" rx="38" fill="#0c0b1a" opacity="0.72"/>`;
    g += `<text id="captxt" x="0" y="24" font-family="Inter" font-size="68" font-weight="800" text-anchor="middle" stroke="#0c0b1a" stroke-width="3" paint-order="stroke">${tsp}</text></g>`;
  }
  return g;
}

function frameSVG(tl, T) {
  const bs = tl.blocks;
  let i = bs.findIndex(b => T >= b.t0 && T < b.t1);
  if (i < 0) i = bs.length - 1;
  const b = bs[i];
  let body = '';
  const FADE = 0.22;
  const hard = ['behind', 'end'].includes(b.scene);
  if (i > 0 && !hard && T - b.t0 < FADE) {
    body += sceneLayer(bs[i - 1], T, 1);
    body += sceneLayer(b, T, ease((T - b.t0) / FADE));
  } else body += sceneLayer(b, T, 1);
  // Schwarzblende ganz am Ende und kurzer Blackout direkt vor der Endkarte
  let black = 0;
  if (b.scene === 'end' && T - b.t0 < 0.15) black = 1 - (T - b.t0) / 0.15;
  if (tl.total - T < 0.3) black = 1 - (tl.total - T) / 0.3;
  if (b.scene === 'behind' && b.t1 - T < 0.25) black = 1 - (b.t1 - T) / 0.25;
  let flash = 0;
  if (b.scene === 'behind') { const st = b.cues.stinger ?? 0.1, k = T - b.t0 - st; if (k > 0 && k < 0.18) flash = 0.55 * (1 - k / 0.18); }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" stroke-linejoin="round">${DEFS}${body}` +
    (flash ? `<rect width="1080" height="1920" fill="#fff" opacity="${f1(flash * 100) / 100}"/>` : '') +
    overlay(tl, T, b) + (black ? `<rect width="1080" height="1920" fill="#000" opacity="${f1(clamp(black) * 100) / 100}"/>` : '') + '</svg>';
}

const PAGE = `<html><head><style>html,body{margin:0;background:#000;overflow:hidden}
#grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:overlay}</style></head>
<body><div id="stage"></div><canvas id="grain" width="540" height="960" style="width:1080px;height:1920px"></canvas>
<script>
const gc=document.getElementById('grain').getContext('2d');
window.setFrame=(svg,seed)=>{
  document.getElementById('stage').innerHTML=svg;
  for(const [g,b,px,py] of [['cap','capbg',46,24],['chip','chipbg',34,16]]){
    const t=document.getElementById(g==='cap'?'captxt':'chiptxt'); if(!t) continue;
    const bb=t.getBBox(), r=document.getElementById(b);
    r.setAttribute('x',bb.x-px); r.setAttribute('y',bb.y-py); r.setAttribute('width',bb.width+2*px); r.setAttribute('height',bb.height+2*py);
  }
  const id=gc.createImageData(540,960); let s=seed*9301+49297;
  for(let i=0;i<id.data.length;i+=4){ s=(s*1103515245+12345)&0x7fffffff; const v=(s>>16)&255; id.data[i]=id.data[i+1]=id.data[i+2]=v; id.data[i+3]=255; }
  gc.putImageData(id,0,0);
};
</script></body></html>`;

async function worker(tlPath, outDir, k, N) {
  const { chromium } = require('playwright');
  const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  tl.blocks.forEach((b, i) => { b.idx = i; });
  // Chip-Startzeit (nur neu einblenden, wenn sich der Text ändert)
  let last = null, ls = 0;
  for (const b of tl.blocks) { if (b.chip !== last) { ls = b.t0; last = b.chip; } b.chipStart = ls; }
  const n = Math.round(tl.total * FPS);
  const a = Math.floor(n * k / N), e = Math.floor(n * (k + 1) / N);
  const out = path.join(outDir, `chunk${k}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(PAGE);
  await p.evaluate(() => document.fonts.ready);
  for (let f = a; f < e; f++) {
    const T = f / FPS;
    await p.evaluate(([s, sd]) => window.setFrame(s, sd), [frameSVG(tl, T), f % 7]);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (k === 0 && f % 60 === 0) process.stdout.write(`\r  frame ${f}/${e}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
}

async function main() {
  const [tlPath, outDir, wk] = process.argv.slice(2);
  if (process.env.WORKER) return worker(tlPath, outDir, +process.env.WORKER_K, +process.env.WORKER_N);
  const N = +(wk || 4);
  await Promise.all([...Array(N)].map((_, k) => new Promise((res, rej) => {
    const c = spawn(process.execPath, [__filename, tlPath, outDir], { stdio: 'inherit', env: { ...process.env, WORKER: 1, WORKER_K: k, WORKER_N: N } });
    c.on('close', code => code === 0 ? res() : rej(new Error('worker ' + k)));
  })));
  const list = path.join(outDir, 'chunks.txt');
  fs.writeFileSync(list, [...Array(N)].map((_, k) => `file 'chunk${k}.mp4'`).join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(outDir, 'silent.mp4')]);
  console.log('\nvideo ok');
}

// Einzelbild-Vorschau: node render.js --still <timing.json> <out.png> <T...>
if (process.argv[2] === '--still') {
  (async () => {
    const { chromium } = require('playwright');
    const tl = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
    tl.blocks.forEach((b, i) => { b.idx = i; b.chipStart = b.t0; });
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.setContent(PAGE);
    const ts = process.argv.slice(5).map(Number);
    for (let i = 0; i < ts.length; i++) {
      await p.evaluate(([s, sd]) => window.setFrame(s, sd), [frameSVG(tl, ts[i]), 1]);
      await p.screenshot({ path: process.argv[4].replace('.png', `_${String(i).padStart(2, '0')}.png`) });
    }
    await b.close();
  })();
} else main().catch(e => { console.error(e); process.exit(1); });
