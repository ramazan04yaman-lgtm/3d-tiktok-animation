// Alle Szenen: draw(t, d, cue) liefert SVG in Weltkoordinaten 1080x1920.
// t = lokale Zeit in s, d = Szenendauer, cue(name) = lokale Zeit eines Sound-/Story-Cues (oder null)
const L = require('./lib');
const { INK, C, clamp, lerp, ease, easeOut, f1, rng, mix, limb, glow, txt, blinkAt, head, person, personSitting,
  povHands, povThumbs, phone, dog, carRear, facadeWindows } = L;

const NIGHT = '#1a2350';
const sky = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const since = (t, c) => (c == null ? -1 : t - c);

// ---------------------------------------------------------------- 1 Bett (Hook)
function bed(t, d) {
  const wake = ease((t - 0.25) / 0.2);
  let g = `<defs>${sky('bw', '#33416e', '#1c2444')}${sky('win', '#f6d9b0', '#a8c4e6')}</defs>`;
  g += `<rect width="1080" height="1920" fill="url(#bw)"/>`;
  g += `<path d="M0,0 L1080,0 L1080,140 L0,180Z" fill="#000" opacity="0.15"/>`;
  // Fenster mit Morgenlicht + leerer Stadt
  g += `<rect x="560" y="260" width="400" height="540" rx="10" fill="url(#win)" stroke="${INK}" stroke-width="8"/>`;
  g += `<path d="M560,640 L600,560 L640,600 L700,500 L760,560 L820,470 L880,560 L960,520 L960,800 L560,800Z" fill="#8f9fc4" opacity="0.8"/>`;
  g += `<path d="M760,260 L760,800 M560,530 L960,530" stroke="${INK}" stroke-width="12"/>`;
  g += `<polygon points="560,800 960,800 1080,1500 260,1500" fill="#ffe7c2" opacity="0.12"/>`;
  g += `<path d="M520,230 Q560,560 510,840 L570,840 L570,230Z" fill="#7a3f4f" stroke="${INK}" stroke-width="6"/><path d="M970,230 Q930,560 990,840 L1040,840 L1040,230Z" fill="#7a3f4f" stroke="${INK}" stroke-width="6"/>`;
  // Poster
  g += `<rect x="90" y="330" width="230" height="300" rx="6" fill="#d9584a" stroke="${INK}" stroke-width="6" transform="rotate(-4 205 480)"/>`;
  g += `<circle cx="205" cy="450" r="60" fill="#ffd23f" stroke="${INK}" stroke-width="5"/>`;
  // Bett
  g += `<rect x="40" y="880" width="760" height="330" rx="40" fill="#7a5238" stroke="${INK}" stroke-width="7"/>`;
  g += `<rect x="70" y="910" width="700" height="40" rx="18" fill="#94664a"/>`;
  g += `<path d="M150,1080 Q300,1000 520,1060 Q560,1130 500,1200 L160,1200 Q110,1140 150,1080Z" fill="#eef1f8" stroke="${INK}" stroke-width="6"/>`;
  const sit = lerp(40, 0, wake);
  g += person({ x: 380, y: 1430 + sit, s: 1.15, view: 'front', expr: t < 0.3 ? 'sleepy' : 'wide', blink: t < 0.25 ? 1 : 0,
    look: [lerp(0, 8, ease((t - 1) / 0.4)), -2], legs: 'none', breath: t, arms: { l: [10, -60, 'front'], r: [10, -60, 'front'] } });
  g += `<path d="M-20,1250 Q220,1170 420,1250 Q660,1200 880,1260 L880,1940 L-20,1940Z" fill="#3c8f88" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  g += `<path d="M60,1420 Q260,1360 470,1460 M560,1360 Q720,1330 860,1420 M120,1680 Q420,1600 820,1700" fill="none" stroke="#2a6b66" stroke-width="10" stroke-linecap="round"/>`;
  // Nachttisch + Handy
  g += `<rect x="800" y="1150" width="300" height="520" rx="12" fill="#5a3b2a" stroke="${INK}" stroke-width="7"/><rect x="830" y="1250" width="240" height="120" rx="10" fill="#6d4a35" stroke="${INK}" stroke-width="5"/><circle cx="950" cy="1310" r="10" fill="#d8b46a"/>`;
  const vib = t < 1.2 ? Math.sin(t * 90) * 4 : 0;
  g += phone(930 + vib, 1120, 140, 64, -90, txt(0, 12, '07:12', 30, '#fff', 800, 'middle', 'transform="rotate(90)"'), '#9fd0ff', 0.6);
  g += `<rect x="830" y="980" width="70" height="140" rx="8" fill="#ffd27a" opacity="0.9" stroke="${INK}" stroke-width="5"/><path d="M820,980 L910,980 L890,920 L840,920Z" fill="#e8a33d" stroke="${INK}" stroke-width="5"/>`;
  return g;
}

// ---------------------------------------------------------------- 2 Handy POV
function phoneScreen1(t) {
  let s = '';
  s += txt(0, -300, '07:13', 120, '#fff', 800);
  s += txt(0, -232, 'Montag, 16. November', 34, '#dfe8ff', 600);
  const pulse = 1 + 0.05 * Math.sin(t * 8);
  s += `<g transform="translate(0,-60) scale(${f1(pulse * 100) / 100})"><rect x="-210" y="-70" width="420" height="140" rx="34" fill="#fff" opacity="0.16"/>${txt(0, -8, '0 Nachrichten', 54, '#fff', 800)}${txt(0, 44, '0 verpasste Anrufe', 34, '#ffd23f', 700)}</g>`;
  // Signal + rotes X
  s += '<g transform="translate(-70,160)">' + [0, 1, 2, 3].map(i => `<rect x="${i * 36}" y="${-24 - i * 20}" width="24" height="${34 + i * 20}" rx="5" fill="#fff" opacity="0.35"/>`).join('') +
    `<path d="M-10,-100 L140,30 M140,-100 L-10,30" stroke="${C.red}" stroke-width="16" stroke-linecap="round"/></g>`;
  s += txt(0, 280, 'KEIN NETZ', 58, '#fff', 900);
  // Lade-Spinner
  const a = t * 360;
  s += `<g transform="translate(0,370) rotate(${f1(a)})">` + [...Array(8)].map((_, i) => `<circle cx="${f1(Math.cos(i * Math.PI / 4) * 28)}" cy="${f1(Math.sin(i * Math.PI / 4) * 28)}" r="7" fill="#fff" opacity="${(i + 1) / 9}"/>`).join('') + '</g>';
  return s;
}
function phonePOV(t, d) {
  let g = `<defs>${sky('pb', '#26305a', '#121731')}</defs><rect width="1080" height="1920" fill="url(#pb)"/>`;
  const r = rng(4);
  for (let i = 0; i < 14; i++) g += `<circle cx="${f1(r() * 1080)}" cy="${f1(r() * 1920)}" r="${f1(30 + r() * 80)}" fill="${['#ffd27a', '#7aa8ff', '#ff8a7a'][i % 3]}" opacity="0.12" filter="url(#blurM)"/>`;
  const bob = Math.sin(t * 1.7) * 8;
  g += povHands(540, 900 + bob, 520, 1040);
  g += phone(540, 880 + bob, 520, 1040, -3, phoneScreen1(t), '#9fd0ff', 0.55);
  const tap = Math.max(0, Math.sin(t * 5)) * (t > 1.0 ? 1 : 0);
  g += povThumbs(540, 900 + bob, 520, 1040, tap);
  return g;
}

// ---------------------------------------------------------------- Straße (3) + überwuchert (12)
function streetBase(t, over = 0) {
  const g0 = over > 0;
  let g = `<defs>${sky('ss', g0 ? '#9fd8e8' : '#c4d6d6', g0 ? '#e8f2d8' : '#e9dcc4')}</defs><rect width="1080" height="900" fill="url(#ss)"/>`;
  // Hintergrund-Skyline
  const r = rng(3);
  let x = 380;
  while (x < 700) {
    const w = 40 + r() * 50, h = 160 + r() * 260;
    g += `<rect x="${f1(x)}" y="${f1(850 - h)}" width="${f1(w)}" height="${f1(h + 20)}" fill="${g0 ? '#9fb3a0' : '#a6aec0'}" stroke="${INK}" stroke-width="4"/>`;
    x += w;
  }
  // Straße
  g += `<polygon points="470,850 610,850 1380,1920 -300,1920" fill="${g0 ? '#6b6d66' : '#5b5f6e'}" stroke="${INK}" stroke-width="5"/>`;
  g += `<polygon points="400,850 470,850 -300,1920 -500,1920" fill="#a99a86" stroke="${INK}" stroke-width="5"/>`;
  g += `<polygon points="610,850 680,850 1580,1920 1380,1920" fill="#a99a86" stroke="${INK}" stroke-width="5"/>`;
  for (let k = 0; k < 7; k++) {
    const t0 = Math.pow(k / 7, 1.6), t1 = Math.pow((k + 0.5) / 7, 1.6);
    const y0 = 850 + 1070 * t0, y1 = 850 + 1070 * t1, w0 = 4 + 30 * t0, w1 = 4 + 30 * t1;
    g += `<polygon points="${540 - w0},${y0} ${540 + w0},${y0} ${540 + w1},${y1} ${540 - w1},${y1}" fill="#f2e6b8"/>`;
  }
  // Fassaden
  g += `<polygon points="-10,-10 400,520 400,860 -10,1500" fill="#b5654a" stroke="${INK}" stroke-width="6"/>`;
  g += `<polygon points="-10,1500 400,860 400,880 -10,1540" fill="#7d3f2e"/>`;
  g += facadeWindows(20, 380, 40, 1380, 530, 840, 4, 6, '#2c3550', INK);
  g += `<polygon points="1090,-10 680,520 680,860 1090,1500" fill="#5d8c8c" stroke="${INK}" stroke-width="6"/>`;
  g += facadeWindows(1060, 700, 40, 1380, 530, 840, 4, 6, '#26324d', INK);
  // Ampel (blinkt gelb)
  const on = Math.floor(t * 1.6) % 2 === 0;
  g += `<rect x="762" y="560" width="14" height="420" fill="#2b2b38" stroke="${INK}" stroke-width="4"/><rect x="738" y="500" width="62" height="150" rx="14" fill="#2b2b38" stroke="${INK}" stroke-width="5"/>`;
  g += `<circle cx="769" cy="535" r="16" fill="#5a2020"/><circle cx="769" cy="575" r="16" fill="${on ? '#ffc93a' : '#6a5520'}"/><circle cx="769" cy="615" r="16" fill="#1f4a2a"/>`;
  if (on) g += glow(769, 575, 40, '#ffc93a', 0.8, 'blurS');
  return g;
}
function grassAndVines(t, grow) {
  let g = '';
  const gr = '#4f9a4a', gd = '#2f6b35';
  for (const [vx, vy, ln] of [[60, 200, 900], [220, 420, 700], [330, 560, 380], [1000, 180, 900], [860, 380, 650], [740, 540, 380]]) {
    let d = `M${vx},${vy} `;
    for (let k = 0; k < 6; k++) d += `q${(k % 2 ? -1 : 1) * 26},${ln / 12} 0,${ln / 6} `;
    g += `<path d="${d}" fill="none" stroke="${gd}" stroke-width="12" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f1((1 - grow) * 100) / 100}"/>`;
    for (let k = 0; k < 6; k++) if (grow > k / 6) {
      const lx = vx + (k % 2 ? -1 : 1) * 24, ly = vy + k * ln / 6 + 20;
      g += `<ellipse cx="${lx}" cy="${f1(ly)}" rx="26" ry="14" fill="${gr}" stroke="${INK}" stroke-width="3" transform="rotate(${(k % 2 ? -1 : 1) * 30 + Math.sin(t * 2 + k) * 6} ${lx} ${f1(ly)})"/>`;
    }
  }
  g += `<path d="M540,1100 l-30,90 l40,60 l-60,120 l30,90 M300,1500 l80,40 l20,90 M780,1300 l-40,80 l60,70" fill="none" stroke="${INK}" stroke-width="7"/>`;
  const r = rng(5);
  for (let i = 0; i < 80; i++) {
    const gx = r() * 1180 - 50, gy = 1000 + r() * 950, sz = (20 + (gy - 900) / 18) * clamp(grow * 1.3);
    const sw = Math.sin(t * 2.5 + gx * 0.02) * sz * 0.15;
    g += `<path d="M${f1(gx - sz / 2)},${f1(gy)} l${f1(sz / 4 + sw)},${f1(-sz * 1.4)} l${f1(sz / 4 - sw)},${f1(sz * 1.2)} l${f1(sz / 4 + sw)},${f1(-sz * 1.6)} l${f1(sz / 4 - sw)},${f1(sz * 1.6)}Z" fill="${r() < 0.6 ? gr : gd}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  return g;
}
function puffs(t, x, y, n = 4) {
  let g = '';
  for (let i = 0; i < n; i++) {
    const p = ((t * 0.7 + i / n) % 1);
    g += `<circle cx="${f1(x - p * 90 + Math.sin(p * 6 + i) * 10)}" cy="${f1(y - p * 120)}" r="${f1(14 + p * 40)}" fill="#e8e8ee" opacity="${f1((1 - p) * 0.75 * 100) / 100}" stroke="${INK}" stroke-width="3"/>`;
  }
  return g;
}
function street(t, d) {
  let g = streetBase(t);
  g += carRear(470, 1080, 0.55, '#3d6fa8', { lights: 0.8, door: 0.6 }) + puffs(t, 400, 1075, 3);
  g += carRear(650, 1460, 1.05, '#c94a3c', { lights: 0.6 + 0.4 * Math.abs(Math.sin(t * 3)), door: 0.8 }) + puffs(t + 0.3, 520, 1450, 5);
  // Papier fliegt
  const px = (t * 220) % 1300 - 100;
  g += `<path d="M${f1(px)},${f1(1600 - px * 0.2 + Math.sin(t * 4) * 30)} l50,-12 l10,38 l-52,10Z" fill="#f4f0e6" stroke="${INK}" stroke-width="4" transform="rotate(${f1(t * 120)} ${f1(px + 25)} ${f1(1610 - px * 0.2)})"/>`;
  g += person({ x: 220, y: 1560, s: 0.85, view: 'back', breath: t, arms: { l: [8, 10], r: [8, 10] }, headTilt: Math.sin(t * 1.2) * 8 });
  return g;
}
function green(t, d) {
  const grow = easeOut(t / Math.max(1.5, d * 0.7));
  let g = streetBase(t, 1);
  g += grassAndVines(t, grow);
  // Baum aus dem Asphalt
  const ts = ease(t / 1.6) * 0.3 + 0.7;
  g += `<g transform="translate(545,1210) scale(${f1(ts * 100) / 100}) translate(-545,-1210)">`;
  g += `<path d="M520,1210 Q500,1000 530,860 L560,860 Q590,1000 580,1210Z" fill="#6b4a35" stroke="${INK}" stroke-width="6"/>`;
  for (const [cx, cy, rad] of [[545, 780, 160], [430, 860, 110], [660, 860, 115], [545, 640, 110]]) {
    g += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#4f9a4a" stroke="${INK}" stroke-width="6"/><circle cx="${f1(cx - rad * 0.3)}" cy="${f1(cy - rad * 0.3)}" r="${f1(rad * 0.35)}" fill="#7cc06f" opacity="0.8"/>`;
  }
  g += '</g>';
  g += carRear(470, 1080, 0.55, '#3d6fa8', { rust: 0.8, vines: grow });
  g += carRear(650, 1460, 1.05, '#c94a3c', { rust: 0.8, vines: grow });
  // Vögel
  for (let i = 0; i < 4; i++) {
    const bx = ((t * 160 + i * 230) % 1400) - 150, by = 260 + i * 70 + Math.sin(t * 2 + i) * 20, w = Math.sin(t * 14 + i) * 16;
    g += `<path d="M${f1(bx - 26)},${f1(by - w)} Q${f1(bx - 12)},${f1(by - 10)} ${f1(bx)},${f1(by)} Q${f1(bx + 12)},${f1(by - 10)} ${f1(bx + 26)},${f1(by - w)}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  }
  const wx = 300 + t * 30;
  g += person({ x: wx, y: 1640, s: 0.75, view: 'back', legs: 'walk', phase: t * 6, backpack: true, arms: { l: [Math.sin(t * 6) * 18, 10], r: [-Math.sin(t * 6) * 18, 10] } });
  return g;
}

// ---------------------------------------------------------------- 4 Nachbartür
function door(t, d, cue) {
  const kn = cue('knock'), cr = cue('creak');
  let g = `<defs>${sky('hw', '#6b4f6e', '#3e2c47')}</defs><rect width="1080" height="1920" fill="url(#hw)"/>`;
  for (let i = 0; i < 9; i++) g += `<path d="M${i * 130 + 30},0 L${i * 130 + 30},1500" stroke="#5a405c" stroke-width="14"/>`;
  g += `<rect x="0" y="1480" width="1080" height="440" fill="#7a5238" stroke="${INK}" stroke-width="6"/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M0,${1540 + i * 70} L1080,${1540 + i * 70}" stroke="#5e3e2a" stroke-width="5"/>`;
  g += `<rect x="900" y="300" width="18" height="90" fill="#2b2b38"/>` + glow(909, 420, 120, '#ffd27a', 0.5) + `<path d="M860,390 L960,390 L940,460 L880,460Z" fill="#ffd27a" stroke="${INK}" stroke-width="5"/>`;
  // Tür
  const open = cr == null ? 0 : ease(since(t, cr) / 1.4) * 0.55;
  g += `<rect x="330" y="420" width="460" height="1080" fill="#3a2a22" stroke="${INK}" stroke-width="12"/>`;
  g += `<rect x="345" y="435" width="${f1(430 * open)}" height="1050" fill="#ffe7b0"/>`;
  if (open > 0) g += `<polygon points="345,1485 ${f1(345 + 430 * open)},1485 ${f1(500 + 800 * open)},1920 ${f1(200)},1920" fill="#ffe7b0" opacity="0.35"/>` + glow(400 + 200 * open, 900, 200, '#ffe7b0', 0.5 * open / 0.55);
  const dw = 430 * (1 - open);
  g += `<g transform="translate(${f1(345 + 430 - dw)},0)"><rect x="0" y="435" width="${f1(dw)}" height="1050" fill="#3e6b5a" stroke="${INK}" stroke-width="6"/>`;
  g += `<rect x="${f1(dw * 0.12)}" y="500" width="${f1(dw * 0.76)}" height="380" rx="8" fill="#355d4e" stroke="${INK}" stroke-width="5"/><rect x="${f1(dw * 0.12)}" y="960" width="${f1(dw * 0.76)}" height="440" rx="8" fill="#355d4e" stroke="${INK}" stroke-width="5"/>`;
  g += `<circle cx="${f1(dw * 0.12)}" cy="940" r="16" fill="#d8b46a" stroke="${INK}" stroke-width="4"/></g>`;
  g += `<rect x="480" y="340" width="160" height="60" rx="10" fill="#d8b46a" stroke="${INK}" stroke-width="5"/>` + txt(560, 384, 'Nr. 4', 38, INK, 900);
  g += `<rect x="380" y="1500" width="360" height="70" rx="10" fill="#a8563f" stroke="${INK}" stroke-width="5"/>` + txt(560, 1548, 'WILLKOMMEN', 36, '#f3d9b0', 900);
  // Figur rennt herein, klopft
  const run = easeOut(t / 1.1);
  const px = lerp(-150, 230, run);
  let ar = [10, 10];
  if (kn != null && since(t, kn) > -0.3) {
    const k = since(t, kn);
    const hit = k >= 0 && k < 0.9 ? Math.abs(Math.sin(k * Math.PI / 0.3)) : 0;
    ar = [lerp(120, 132, hit), lerp(-70, -40, hit)];
  }
  g += person({ x: px, y: 1600, s: 1.05, view: 'back', legs: run < 1 ? 'walk' : 'stand', phase: t * 12, breath: t, arms: { l: [10, 10], r: ar } });
  return g;
}

// ---------------------------------------------------------------- 5 Kaffee
function coffee(t, d) {
  let g = `<defs>${sky('kw', '#e9dcc0', '#cdbb98')}</defs><rect width="1080" height="1920" fill="url(#kw)"/>`;
  for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) g += `<rect x="${i * 125 - 20}" y="${j * 125 + 60}" width="118" height="118" rx="6" fill="#efe6d2" stroke="#c9b894" stroke-width="4"/>`;
  g += `<rect x="640" y="180" width="340" height="420" rx="10" fill="#bfe3f2" stroke="${INK}" stroke-width="8"/><path d="M810,180 L810,600 M640,390 L980,390" stroke="${INK}" stroke-width="10"/>`;
  g += glow(810, 390, 260, '#fff6d8', 0.5);
  g += `<path d="M140,520 L140,1020 M300,520 L300,1020 M140,600 L300,600 M140,760 L300,760" stroke="#6b4a35" stroke-width="18" stroke-linecap="round"/>`;
  // Tisch
  g += `<polygon points="-20,1020 1100,1020 1100,1940 -20,1940" fill="#a5714c" stroke="${INK}" stroke-width="7"/>`;
  for (let k = 0; k < 6; k++) g += `<path d="M-20,${1140 + k * 150} L1100,${1140 + k * 150}" stroke="#8a5c3c" stroke-width="5"/>`;
  // Zeitung, Teller mit Toast
  g += `<polygon points="620,1300 980,1250 1040,1520 680,1580" fill="#f4f0e6" stroke="${INK}" stroke-width="5"/>` + txt(830, 1330, 'HEUTE', 40, INK, 900, 'middle', 'transform="rotate(-8 830 1330)"');
  for (let k = 0; k < 5; k++) g += `<path d="M${700 + k * 4},${1380 + k * 34} L${960 + k * 6},${1340 + k * 34}" stroke="#9a9a9a" stroke-width="6"/>`;
  g += `<ellipse cx="250" cy="1620" rx="200" ry="72" fill="#f4f4f4" stroke="${INK}" stroke-width="6"/>`;
  g += `<path d="M170,1600 Q170,1560 230,1560 L320,1570 Q340,1600 310,1630 L190,1640Z" fill="#e3a659" stroke="${INK}" stroke-width="5"/><circle cx="318" cy="1590" r="22" fill="#f4f4f4"/>`;
  // Tasse (rot, kommt später wieder vor)
  g += `<ellipse cx="540" cy="1400" rx="180" ry="50" fill="#000" opacity="0.2"/>`;
  g += `<path d="M680,1180 Q800,1180 790,1270 Q780,1340 670,1330" fill="none" stroke="${INK}" stroke-width="34"/><path d="M680,1180 Q800,1180 790,1270 Q780,1340 670,1330" fill="none" stroke="${C.mug}" stroke-width="20"/>`;
  g += `<path d="M400,1130 L412,1360 Q540,1430 668,1360 L680,1130Z" fill="${C.mug}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  g += `<path d="M600,1150 L606,1360 Q640,1360 668,1350 L680,1140Z" fill="#a8372c" opacity="0.6"/>`;
  g += `<ellipse cx="540" cy="1130" rx="140" ry="36" fill="${C.mug}" stroke="${INK}" stroke-width="7"/><ellipse cx="540" cy="1134" rx="118" ry="26" fill="#4a2c1a"/>`;
  g += `<path d="M450,1240 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0" fill="#f4e0c0" opacity="0.8"/>`;
  // Dampf
  for (let k = 0; k < 3; k++) {
    const sx = 480 + k * 60, ph = t * 3 + k * 2;
    let dd = `M${sx},1090`;
    for (let s = 1; s <= 6; s++) dd += ` L${f1(sx + Math.sin(ph - s * 0.9) * 26)},${1090 - s * 70}`;
    g += `<path d="${dd}" fill="none" stroke="#fff" stroke-width="${16 - k * 2}" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`;
  }
  // Hand nähert sich
  const reach = ease((t - 0.5) / 1.4);
  const hx = lerp(1250, 720, reach), hy = lerp(1500, 1250, reach);
  g += limb([[1300, 1900], [hx + 60, hy + 100]], C.hood, 90);
  g += `<path d="M${f1(hx + 70)},${f1(hy + 40)} Q${f1(hx - 10)},${f1(hy + 10)} ${f1(hx - 10)},${f1(hy + 70)} Q${f1(hx + 10)},${f1(hy + 130)} ${f1(hx + 90)},${f1(hy + 120)}Z" fill="${C.skin}" stroke="${INK}" stroke-width="6"/>`;
  return g;
}

// ---------------------------------------------------------------- 6 Stromausfall
function blackout(t, d, cue) {
  const pd = cue('powerdown');
  const T0 = pd == null ? 1e9 : pd;
  const dark = clamp(since(t, T0) / 1.6);
  let g = `<defs>${sky('nb', mix('#1d2b5e', '#0b0f22', dark), mix('#3b3f7a', '#121433', dark))}</defs><rect width="1080" height="1920" fill="url(#nb)"/>`;
  const r0 = rng(2);
  for (let i = 0; i < 40; i++) g += `<circle cx="${f1(r0() * 1080)}" cy="${f1(r0() * 700)}" r="${f1(1.5 + r0() * 2.5)}" fill="#fff" opacity="${f1((0.3 + 0.7 * dark) * 100) / 100}"/>`;
  g += `<circle cx="820" cy="300" r="80" fill="#f4ecd0" stroke="${INK}" stroke-width="6"/>` + glow(820, 300, 160, '#f4ecd0', 0.3);
  const r = rng(8);
  let x = -20;
  while (x < 1100) {
    const w = 110 + r() * 110, h = 400 + r() * 700, col = ['#2c3a6b', '#33427a', '#283463'][Math.floor(r() * 3)];
    g += `<rect x="${f1(x)}" y="${f1(1300 - h)}" width="${f1(w)}" height="${f1(h + 700)}" fill="${mix(col, '#0b0f22', dark * 0.5)}" stroke="${INK}" stroke-width="5"/>`;
    const cols = Math.max(2, Math.floor(w / 46)), rows = Math.max(4, Math.floor(h / 80));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const wx = x + 10 + i * (w - 20) / cols, wy = 1330 - h + j * (h - 40) / rows;
      const lit0 = r() < 0.55, off = T0 + (wx / 1080) * 1.0 + r() * 0.35;
      const flick = t > off - 0.3 && t < off && Math.sin(t * 60 + i * 3 + j) > 0;
      const lit = lit0 && (t < off - 0.3 || flick);
      g += `<rect x="${f1(wx)}" y="${f1(wy)}" width="${f1((w - 20) / cols * 0.6)}" height="${f1((h - 40) / rows * 0.55)}" fill="${lit ? '#ffd27a' : '#161c38'}"/>`;
    }
    x += w - 4;
  }
  // Strommast mit Funken
  g += `<path d="M440,1960 L540,700 L640,1960 M470,1600 L610,1600 M490,1300 L590,1300 M510,1000 L570,1000 M370,850 L710,850 M400,1100 L680,1100 M470,1600 L590,1300 L490,1300 L610,1600 M490,1300 L570,1000 L510,1000 L590,1300" fill="none" stroke="#0b0b14" stroke-width="16" stroke-linejoin="round"/>`;
  g += `<path d="M370,850 Q100,950 -40,900 M710,850 Q950,960 1120,900" fill="none" stroke="#0b0b14" stroke-width="7"/>`;
  const bl = Math.floor(t * 2) % 2 === 0;
  if (bl) g += glow(540, 690, 60, C.red, 0.9, 'blurS');
  g += `<circle cx="540" cy="690" r="18" fill="${bl ? C.red : '#5a1a1a'}" stroke="${INK}" stroke-width="4"/>`;
  const sp = since(t, T0);
  if (sp > 0 && sp < 0.8) {
    const rr = rng(Math.floor(t * 20));
    for (let i = 0; i < 6; i++) { const a = rr() * Math.PI * 2, l = 30 + rr() * 80; g += `<path d="M710,850 L${f1(710 + Math.cos(a) * l)},${f1(850 + Math.sin(a) * l)}" stroke="#fff6a0" stroke-width="5" stroke-linecap="round"/>`; }
    g += glow(710, 850, 90, '#fff6a0', 0.8 * (1 - sp / 0.8), 'blurS');
  }
  // Zimmer-Rahmen + Figur am Fenster
  g += `<path d="M0,0 L1080,0 L1080,1920 L0,1920Z M80,140 L1000,140 L1000,1380 L80,1380Z" fill="${mix('#2a2140', '#0a0812', dark)}" fill-rule="evenodd" stroke="${INK}" stroke-width="10"/>`;
  g += `<path d="M540,140 L540,1380 M80,760 L1000,760" stroke="${INK}" stroke-width="16"/>`;
  g += `<rect x="60" y="1370" width="960" height="40" fill="#4a3858" stroke="${INK}" stroke-width="6"/>`;
  g += person({ x: 540, y: 1700, s: 1.25, view: 'back', tint: 0.35 + dark * 0.35, tc: '#0b1030', breath: t, headTilt: Math.sin(t) * 5 });
  return g;
}

// ---------------------------------------------------------------- 7 Hunde
function dogs(t, d, cue) {
  const gr = cue('growl');
  let g = `<defs>${sky('ab', '#1b2142', '#2c2a45')}</defs><rect width="1080" height="1920" fill="url(#ab)"/>`;
  g += `<polygon points="0,0 360,600 360,1250 0,1920" fill="#5a2f2f" stroke="${INK}" stroke-width="6"/>`;
  for (let j = 0; j < 14; j++) g += `<path d="M0,${j * 140} L360,${600 + j * 48}" stroke="#472424" stroke-width="5"/>`;
  g += `<polygon points="1080,0 720,600 720,1250 1080,1920" fill="#4a2a35" stroke="${INK}" stroke-width="6"/>`;
  g += `<polygon points="360,1250 720,1250 1080,1920 0,1920" fill="#33324a" stroke="${INK}" stroke-width="6"/>`;
  g += `<rect x="360" y="600" width="360" height="650" fill="#3b4570" stroke="${INK}" stroke-width="6"/>`;
  // flackernde Laterne
  const fl = (Math.sin(t * 23) + Math.sin(t * 37)) > -0.6 ? 1 : 0.25;
  g += `<rect x="530" y="600" width="16" height="330" fill="#15151f"/>` + `<path d="M500,600 L580,600 L565,640 L515,640Z" fill="#ffd27a" stroke="${INK}" stroke-width="4"/>`;
  g += `<polygon points="515,640 565,640 760,1250 320,1250" fill="#ffd27a" opacity="${0.22 * fl}"/>` + glow(540, 640, 90, '#ffd27a', 0.6 * fl, 'blurM');
  g += `<rect x="790" y="1240" width="180" height="270" rx="10" fill="#2f6b4f" stroke="${INK}" stroke-width="6"/><path d="M780,1260 L980,1240 L985,1290 L785,1300Z" fill="#245540" stroke="${INK}" stroke-width="5"/>`;
  // Hunde kommen näher
  const adv = t / Math.max(d, 1);
  const gw = gr == null ? 0 : clamp(since(t, gr) / 0.3);
  g += dog(lerp(470, 430, adv), lerp(1180, 1230, adv), 0.38 + adv * 0.08, t * 7, 0, 1, true, '#4a3b35');
  g += dog(lerp(640, 660, adv), lerp(1230, 1300, adv), 0.45 + adv * 0.1, t * 7 + 1, 0, 1, false, '#6b5444');
  g += dog(lerp(260, 330, adv), lerp(1440, 1560, adv), 0.75 + adv * 0.15, t * 7 + 2, gw, 1, true, '#7a6450');
  g += dog(lerp(860, 780, adv), lerp(1560, 1700, adv), 0.9 + adv * 0.2, t * 7 + 3, gw, 1, false, '#55443a');
  return g;
}

// ---------------------------------------------------------------- 8 Supermarkt
function market(t, d) {
  let g = `<defs>${sky('mb', '#1a1f38', '#0e1122')}</defs><rect width="1080" height="1920" fill="url(#mb)"/>`;
  g += `<polygon points="0,1920 1080,1920 640,1000 440,1000" fill="#3b4060" stroke="${INK}" stroke-width="6"/>`;
  for (let k = 0; k < 8; k++) g += `<path d="M${440 - k * 70},${1000 + k * 120} L${640 + k * 70},${1000 + k * 120}" stroke="#30344f" stroke-width="5"/>`;
  g += `<rect x="470" y="700" width="140" height="56" rx="8" fill="#1f8a4c" stroke="${INK}" stroke-width="5"/>` + txt(540, 738, 'NOTAUSGANG', 20, '#e8ffe8', 900) + glow(540, 728, 110, '#3dff8a', 0.35, 'blurM');
  const r = rng(12);
  const cols = ['#e2463b', '#ffd23f', '#3d8ee0', '#4caf50', '#f08a2e', '#b562d6', '#f4f0e6'];
  for (const side of [-1, 1]) {
    const xo = side < 0 ? 0 : 1080, xi = side < 0 ? 440 : 640;
    g += `<polygon points="${xo},100 ${xi},700 ${xi},1000 ${xo},1920" fill="#4a4f6e" stroke="${INK}" stroke-width="6"/>`;
    for (let k = 0; k < 6; k++) {
      const yo = 300 + k / 6 * 1300, yi = 720 + k / 6 * 260;
      for (let p = 0; p < 7; p++) {
        const u = p / 7, px = lerp(xo, xi, u), py = lerp(yo, yi, u), sz = 70 * (1 - u * 0.75);
        if (r() < 0.5) g += `<rect x="${f1(px - sz / 2)}" y="${f1(py - sz * 1.3)}" width="${f1(sz * 0.8)}" height="${f1(sz * 1.25)}" rx="4" fill="${cols[Math.floor(r() * cols.length)]}" stroke="${INK}" stroke-width="3"/>`;
      }
      g += `<path d="M${xo},${f1(yo)} L${xi},${f1(yi)}" stroke="#8a90b0" stroke-width="10"/>`;
    }
  }
  for (const [cx, cy, c] of [[380, 1650, 0], [700, 1760, 2], [560, 1500, 4], [300, 1820, 1]]) g += `<rect x="${cx}" y="${cy}" width="70" height="90" rx="6" fill="${cols[c]}" stroke="${INK}" stroke-width="4" transform="rotate(${Math.floor(r() * 80 - 40)} ${cx} ${cy})"/>`;
  // Taschenlampe schwenkt
  const a = Math.sin(t * 1.4) * 14;
  g += `<g transform="rotate(${f1(a)} 600 1250)"><polygon points="600,1250 330,520 870,520" fill="url(#beam)"/></g>`;
  const wz = 1 - t * 0.02;
  g += person({ x: 560, y: 1500 - t * 15, s: 0.95 * wz, view: 'back', legs: 'walk', phase: t * 5, backpack: true, arms: { l: [8, 10], r: [40, 70] } });
  return g;
}

// ---------------------------------------------------------------- 9 Verfaultes Essen + Konserven
function rot(t, d, cue) {
  const kon = cue('cans');
  const decay = ease(t / Math.max(1, (kon == null ? d : kon) * 0.95));
  let g = `<defs>${sky('rb', '#3b3552', '#1c1a2c')}</defs><rect width="1080" height="1920" fill="url(#rb)"/>`;
  g += `<rect x="-20" y="1250" width="1120" height="700" fill="#6b5a4a" stroke="${INK}" stroke-width="6"/>`;
  g += `<rect x="60" y="1040" width="600" height="400" rx="8" fill="#a8774f" stroke="${INK}" stroke-width="7"/>`;
  for (let k = 0; k < 3; k++) g += `<path d="M60,${1120 + k * 110} L660,${1120 + k * 110}" stroke="#7d5636" stroke-width="8"/>`;
  const r = rng(4);
  // Brot + Bananen + Äpfel verfärben sich
  g += `<path d="M120,960 Q130,880 260,880 Q380,880 390,960 Q380,1010 250,1010 Q130,1010 120,960Z" fill="${mix('#e3a659', '#5a6b3a', decay)}" stroke="${INK}" stroke-width="6"/>`;
  for (let k = 0; k < 3; k++) g += `<path d="M${180 + k * 60},900 l20,60" stroke="${mix('#b8743a', '#2f3a1e', decay)}" stroke-width="6"/>`;
  g += `<path d="M420,900 Q520,1010 640,900 Q600,960 520,975 Q450,970 420,900Z" fill="${mix('#ffd23f', '#3a2a14', decay)}" stroke="${INK}" stroke-width="6"/>`;
  for (const [cx, cy] of [[160, 1030], [280, 1015], [400, 1030], [520, 1020], [610, 1035]]) {
    g += `<circle cx="${cx}" cy="${cy}" r="62" fill="${mix('#e2463b', '#5a3a2a', decay)}" stroke="${INK}" stroke-width="6"/><path d="M${cx},${cy - 60} l6,-24" stroke="#4a2a14" stroke-width="7"/>`;
    for (let s = 0; s < 3; s++) g += `<ellipse cx="${f1(cx + r() * 60 - 30)}" cy="${f1(cy + r() * 60 - 30)}" rx="${f1((10 + r() * 14) * decay)}" ry="${f1((8 + r() * 10) * decay)}" fill="#2a2a14" opacity="0.8"/>`;
  }
  // Fliegen
  const nf = Math.floor(3 + decay * 12);
  for (let i = 0; i < nf; i++) {
    const a = t * (2 + i * 0.3) + i, rx = 120 + (i % 4) * 40;
    const fx = 360 + Math.cos(a) * rx, fy = 820 + Math.sin(a * 1.3) * 90;
    g += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="7" fill="${INK}"/><ellipse cx="${f1(fx - 6)}" cy="${f1(fy - 8)}" rx="8" ry="${f1(3 + Math.abs(Math.sin(t * 60 + i)) * 3)}" fill="#dfe8ff" stroke="${INK}" stroke-width="2"/><ellipse cx="${f1(fx + 6)}" cy="${f1(fy - 8)}" rx="8" ry="${f1(3 + Math.abs(Math.cos(t * 60 + i)) * 3)}" fill="#dfe8ff" stroke="${INK}" stroke-width="2"/>`;
  }
  // Konserven leuchten auf
  const hi = kon == null ? 0 : ease(since(t, kon) / 0.4);
  if (hi > 0) g += glow(880, 1250, 260, '#ffd23f', 0.45 * hi);
  for (const [cx, cy] of [[800, 1420], [960, 1420], [880, 1200]]) {
    g += `<rect x="${cx - 74}" y="${cy - 210}" width="148" height="210" rx="8" fill="#c8ccd6" stroke="${INK}" stroke-width="6"/>`;
    g += `<rect x="${cx - 74}" y="${cy - 160}" width="148" height="96" fill="#e2463b" stroke="${INK}" stroke-width="4"/>` + txt(cx, cy - 100, 'BOHNEN', 26, '#fff', 900);
    g += `<ellipse cx="${cx}" cy="${cy - 210}" rx="74" ry="18" fill="#e0e4ec" stroke="${INK}" stroke-width="5"/>`;
  }
  if (hi > 0) g += `<g transform="translate(880,${f1(1000 - 30 * Math.sin(hi * Math.PI / 2))}) scale(${f1(hi * 100) / 100})">${txt(0, 0, 'HALTBAR BIS 2031', 34, '#ffd23f', 900)}</g>`;
  return g;
}

// ---------------------------------------------------------------- 10 Ecke, Stimmen
function corner(t, d, cue) {
  const wh = cue('whisper');
  let g = `<polygon points="0,0 540,600 540,1920 0,1920" fill="#232c5a"/><polygon points="1080,0 540,600 540,1920 1080,1920" fill="#1b2249"/>`;
  g += `<path d="M540,600 L540,1920" stroke="${INK}" stroke-width="6"/><polygon points="0,1500 540,1300 1080,1500 1080,1920 0,1920" fill="#2a2440" stroke="${INK}" stroke-width="6"/>`;
  // Mondlicht-Streifen
  g += `<polygon points="620,1330 800,1300 1000,1600 760,1660" fill="#9fb8ff" opacity="0.18"/><polygon points="650,700 820,620 820,1000 650,1060" fill="#9fb8ff" opacity="0.12"/>`;
  g += txt(250, 450, '03:12', 60, '#ff6a5a', 800, 'middle', 'opacity="0.0"');
  // Schatten-Gestalten flackern
  const act = wh == null ? 0 : clamp(since(t, wh) / 0.6);
  const shapes = [[170, 720, 0.9, 0], [900, 640, 0.8, 1.3], [880, 1150, 0.65, 2.1], [150, 1220, 0.6, 0.7], [540, 380, 0.7, 1.7]];
  for (const [sx, sy, s, ph] of shapes) {
    const op = act * (0.35 + 0.3 * Math.sin(t * 2.2 + ph * 3));
    g += `<g transform="translate(${sx},${f1(sy + Math.sin(t + ph) * 12)}) scale(${s})" opacity="${f1(op * 100) / 100}"><ellipse cx="0" cy="-120" rx="60" ry="70" fill="#05060f"/><path d="M-90,200 Q-100,-30 0,-50 Q100,-30 90,200Z" fill="#05060f"/><circle cx="-22" cy="-120" r="8" fill="#e8ecff"/><circle cx="22" cy="-120" r="8" fill="#e8ecff"/></g>`;
  }
  // Flüster-Blasen
  const words = ['psst…', 'hey…', 'wir sind hier', 'dreh dich um', 'hörst du uns?'];
  words.forEach((w, i) => {
    const st = (wh ?? 1e9) + i * 0.45, k = since(t, st);
    if (k > 0) {
      const op = clamp(k / 0.3) * (1 - clamp((k - 1.6) / 0.5));
      const bx = [230, 820, 860, 220, 540][i], by = [960, 900, 1350, 1440, 560][i] - k * 25;
      g += `<g opacity="${f1(op * 100) / 100}" transform="translate(${bx},${f1(by)}) rotate(${(i % 2 ? 6 : -6)})"><rect x="-150" y="-46" width="300" height="80" rx="40" fill="#e8ecff" stroke="${INK}" stroke-width="5"/>${txt(0, 10, w, 36, '#2a2f55', 800, 'middle', 'font-style="italic"')}</g>`;
    }
  });
  const tr = act > 0 ? Math.sin(t * 50) * 3 : 0;
  g += personSitting({ x: 540, y: 1560, s: 1.05, tint: 0.3, tc: '#141a40', expr: 'wide', look: [Math.sin(t * 1.3) * 7, 0], blink: blinkAt(t), tremble: tr });
  return g;
}

// ---------------------------------------------------------------- 11 Augen-Nahaufnahme
function eyes(t, d) {
  let g = `<rect width="1080" height="1920" fill="#120f22"/>`;
  for (let i = 0; i < 6; i++) {
    const a = t * 0.3 + i;
    g += `<circle cx="540" cy="900" r="${f1(300 + i * 140 + Math.sin(a) * 20)}" fill="none" stroke="#2a2350" stroke-width="40" opacity="0.6"/>`;
  }
  g += glow(1000, 900, 400, C.red, 0.35) + glow(80, 900, 400, '#5a7aff', 0.3);
  const pupil = lerp(1, 0.45, ease(t / 2));
  const tw = Math.sin(t * 40) * (t % 1.7 < 0.15 ? 6 : 0);
  g += `<g transform="translate(540,960) scale(7.2)">`;
  g += head({ expr: 'wide', look: [Math.sin(t * 9) * 1.5, 0], tint: 0.15, tc: '#2a1030' }).replace(/r="6" fill="#17142b"/g, `r="${f1(6 * pupil)}" fill="#17142b"`);
  g += '</g>';
  // Schweißtropfen
  const sd = (t * 120) % 500;
  g += `<path d="M880,${f1(560 + sd)} q22,40 0,60 q-22,-20 0,-60Z" fill="#cfe8ff" stroke="${INK}" stroke-width="5"/>`;
  g += `<rect width="1080" height="1920" fill="${C.red}" opacity="${f1((0.05 + 0.05 * Math.sin(t * 6)) * 100) / 100}"/>`;
  return `<g transform="translate(${f1(tw)},0)">${g}</g>`;
}

// ---------------------------------------------------------------- 13 Handy vibriert
function ring(t, d, cue) {
  const v = cue('vibrate');
  const on = v != null && t > v;
  let g = `<defs>${sky('tb', '#c79a6b', '#a5714c')}</defs><rect width="1080" height="1920" fill="url(#tb)"/>`;
  for (let k = 0; k < 7; k++) g += `<rect x="${-40 + k * 170}" y="-20" width="170" height="1960" fill="${k % 2 ? '#b58459' : '#c08f62'}" stroke="#8a5c3c" stroke-width="5"/>`;
  g += `<ellipse cx="220" cy="1570" rx="150" ry="52" fill="#000" opacity="0.2"/><path d="M90,1340 L110,1560 Q220,1610 330,1560 L350,1340Z" fill="${C.mug}" stroke="${INK}" stroke-width="7"/><ellipse cx="220" cy="1340" rx="130" ry="36" fill="${C.mug}" stroke="${INK}" stroke-width="7"/><ellipse cx="220" cy="1344" rx="110" ry="26" fill="#4a2c1a"/>`;
  g += `<path d="M790,1500 l60,-20 l40,40 l-20,30 l40,40" fill="none" stroke="#d8b46a" stroke-width="12" stroke-linecap="round"/><circle cx="790" cy="1500" r="34" fill="#d8b46a" stroke="${INK}" stroke-width="5"/>`;
  const jit = on ? Math.sin(t * 95) * 9 : 0, jr = on ? Math.sin(t * 70) * 2 : 0;
  const scr = txt(0, -230, '07:12', 90, '#fff', 800) + `<circle cx="0" cy="0" r="90" fill="#fff" opacity="0.15"/>` +
    `<g transform="rotate(${on ? f1(Math.sin(t * 30) * 15) : 0})"><path d="M-45,30 Q-45,-60 0,-65 Q45,-60 45,30 L60,45 L-60,45Z M-15,55 Q0,75 15,55" fill="#ffd23f" stroke="${INK}" stroke-width="4"/></g>` +
    txt(0, 190, on ? '1 neue Nachricht' : '', 44, '#fff', 800);
  g += phone(540 + jit, 900, 460, 900, 12 + jr, scr, on ? '#ffd23f' : '#9fd0ff', on ? 0.55 : 0.3);
  if (on) for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
    const p = ((t - v) * 2 + k / 3) % 1;
    g += `<path d="M${f1(540 + sd * (300 + p * 120))},${f1(720 - p * 30)} q${sd * 40},${f1(180 + p * 30)} 0,${f1(400 + p * 60)}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" opacity="${f1((1 - p) * 100) / 100}"/>`;
  }
  return g;
}

// ---------------------------------------------------------------- 14/15 Nachricht
function chat(t, d, cue, reveal) {
  let s = `<rect x="-235" y="-470" width="470" height="150" fill="#000" opacity="0.25"/>`;
  s += `<g transform="translate(-160,-395) scale(0.42)">${head({ expr: 'neutral', look: [0, 0] })}</g>`;
  s += txt(-100, -400, 'Ich', 48, '#fff', 800, 'start') + txt(-100, -352, 'Meine Nummer', 30, '#ffd23f', 700, 'start');
  if (!reveal) {
    // Banner fährt herein
    const b = easeOut(t / 0.45);
    s += `<g transform="translate(0,${f1(lerp(-700, -180, b))})"><rect x="-225" y="-80" width="450" height="160" rx="30" fill="#f4f4f8" stroke="${INK}" stroke-width="5"/>`;
    s += txt(-190, -28, 'NACHRICHTEN · jetzt', 24, '#666', 700, 'start') + txt(-190, 14, 'Ich (Meine Nummer)', 34, INK, 900, 'start') + txt(-190, 52, 'Hast du kurz Zeit?', 28, '#444', 600, 'start') + '</g>';
  } else {
    const typing = t < d - 0.35;
    if (typing) {
      s += `<rect x="-210" y="-90" width="230" height="110" rx="45" fill="#f4f4f8" stroke="${INK}" stroke-width="4"/>`;
      for (let i = 0; i < 3; i++) s += `<circle cx="${-150 + i * 55}" cy="${f1(-35 - Math.max(0, Math.sin(t * 9 - i)) * 14)}" r="15" fill="#777"/>`;
    } else {
      s += `<rect x="-210" y="-120" width="420" height="250" rx="45" fill="#f4f4f8" stroke="${INK}" stroke-width="5"/>`;
      s += txt(0, -20, 'Dreh dich', 62, INK, 900) + txt(0, 70, 'nicht um.', 62, '#e23b3b', 900);
    }
  }
  return s;
}
function msg(t, d, cue, reveal = false) {
  let g = `<defs>${sky('mb2', '#20264a', '#0d0f1f')}</defs><rect width="1080" height="1920" fill="url(#mb2)"/>`;
  const r = rng(9);
  for (let i = 0; i < 12; i++) g += `<circle cx="${f1(r() * 1080)}" cy="${f1(r() * 1920)}" r="${f1(30 + r() * 80)}" fill="${['#ffd27a', '#7aa8ff'][i % 2]}" opacity="0.1" filter="url(#blurM)"/>`;
  const bob = Math.sin(t * 1.5) * 6;
  g += povHands(540, 760 + bob, 520, 1080);
  g += phone(540, 740 + bob, 520, 1080, -2, chat(t, d, cue, reveal), reveal ? '#ff6a5a' : '#9fd0ff', 0.5);
  g += povThumbs(540, 760 + bob, 520, 1080, 0);
  return g;
}

// ---------------------------------------------------------------- 16 Hinter dir
function behind(t, d, cue) {
  const st = cue('stinger') ?? 0.1;
  const k = since(t, st);
  const rise = easeOut(k / 0.5);
  let g = `<rect width="1080" height="1920" fill="#0c0a18"/>`;
  g += `<polygon points="0,0 1080,0 1080,1920 0,1920" fill="#1a1530"/>`;
  g += `<rect x="120" y="300" width="300" height="420" fill="#1f2a55" stroke="${INK}" stroke-width="8"/><path d="M270,300 L270,720 M120,510 L420,510" stroke="${INK}" stroke-width="10"/>`;
  // Gestalt
  const fy = lerp(380, 0, rise);
  g += `<g transform="translate(0,${f1(fy)})">`;
  g += `<path d="M120,1960 Q100,900 300,500 Q540,200 780,500 Q980,900 960,1960Z" fill="#06040c" stroke="#2a1f45" stroke-width="6"/>`;
  g += `<path d="M300,700 Q190,1100 110,1520 M780,700 Q890,1100 970,1520" fill="none" stroke="#06040c" stroke-width="64" stroke-linecap="round"/>`;
  for (const sd of [-1, 1]) {
    const ex = 540 + sd * 70, op = rise;
    g += glow(ex, 560, 60, '#fff', 0.7 * op, 'blurS') + `<ellipse cx="${ex}" cy="560" rx="${f1(26 * rise + 1)}" ry="${f1(16 * rise + 1)}" fill="#fff"/>`;
  }
  g += `<path d="M430,680 Q540,${f1(680 + 50 * rise)} 650,680" fill="none" stroke="#fff" stroke-width="${f1(6 * rise + 0.1)}" stroke-linecap="round" opacity="${f1(rise * 100) / 100}"/>`;
  g += '</g>';
  // Figur vorn, vom Handy beleuchtet
  g += glow(540, 1420, 340, '#ff6a5a', 0.45);
  g += person({ x: 540, y: 1530, s: 1.3, view: 'front', expr: k > 0.1 ? 'terror' : 'wide', look: [0, 7], tint: 0.25, tc: '#3a0f20', breath: t,
    arms: { l: [20, -110, 'front'], r: [20, -110, 'front'] }, legs: 'none' });
  g += phone(540, 1335, 150, 90, 0, '', '#ff6a5a', 0.7);
  return g;
}

// ---------------------------------------------------------------- Endkarte
function endcard(t, d) {
  let g = `<rect width="1080" height="1920" fill="#0b0a14"/>`;
  const bl = (t % 2.2) > 2.05 ? 0.1 : 1;
  for (const sd of [-1, 1]) g += glow(540 + sd * 90, 560, 60, '#ffd23f', 0.6) + `<ellipse cx="${540 + sd * 90}" cy="560" rx="34" ry="${f1(40 * bl)}" fill="#ffd23f" stroke="${INK}" stroke-width="4"/><ellipse cx="${540 + sd * 90}" cy="560" rx="8" ry="${f1(30 * bl)}" fill="${INK}"/>`;
  const a = easeOut(t / 0.4);
  g += `<g opacity="${f1(a * 100) / 100}" transform="translate(0,${f1((1 - a) * 40)})">`;
  g += txt(540, 840, 'WÜRDEST DU', 104, '#fff', 900) + txt(540, 960, 'DICH', 104, '#fff', 900) + txt(540, 1080, 'UMDREHEN?', 104, '#e23b3b', 900);
  g += txt(540, 1200, 'Schreib es in die Kommentare', 44, '#c9c9e0', 700);
  g += '</g>';
  return g;
}

const SCENES = {
  bed: { draw: bed, cams: [{ z: 2.0, cx: 380, cy: 1150 }, { z: 1.0, cx: 540, cy: 960 }, { z: 1.6, cx: 820, cy: 1100 }] },
  phone: { draw: phonePOV, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.5, cx: 540, cy: 760 }, { z: 1.25, cx: 540, cy: 1000 }] },
  street: { draw: street, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.7, cx: 600, cy: 1330 }, { z: 1.35, cx: 330, cy: 1250 }] },
  door: { draw: door, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.45, cx: 450, cy: 1050 }, { z: 1.25, cx: 560, cy: 1000 }] },
  coffee: { draw: coffee, cams: [{ z: 1.15, cx: 560, cy: 1100 }, { z: 1.8, cx: 540, cy: 1150 }, { z: 1.0, cx: 540, cy: 960 }] },
  blackout: { draw: blackout, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.6, cx: 560, cy: 760 }, { z: 1.3, cx: 540, cy: 1150 }] },
  dogs: { draw: dogs, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.8, cx: 380, cy: 1400 }, { z: 1.35, cx: 600, cy: 1350 }], shake: 4 },
  market: { draw: market, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.4, cx: 540, cy: 1100 }, { z: 1.25, cx: 540, cy: 900 }] },
  rot: { draw: rot, cams: [{ z: 1.4, cx: 360, cy: 1000 }, { z: 1.0, cx: 540, cy: 960 }, { z: 1.6, cx: 880, cy: 1200 }] },
  corner: { draw: corner, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.7, cx: 540, cy: 1320 }, { z: 1.2, cx: 540, cy: 1000 }] },
  eyes: { draw: eyes, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.5, cx: 540, cy: 960 }, { z: 2.2, cx: 360, cy: 960 }], shake: 3 },
  green: { draw: green, cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.5, cx: 600, cy: 1200 }, { z: 1.6, cx: 300, cy: 700 }] },
  ring: { draw: ring, cams: [{ z: 1.1, cx: 540, cy: 960 }, { z: 1.6, cx: 540, cy: 880 }, { z: 1.0, cx: 540, cy: 960 }] },
  msg: { draw: (t, d, c) => msg(t, d, c, false), cams: [{ z: 1.0, cx: 540, cy: 960 }, { z: 1.45, cx: 540, cy: 640 }] },
  msg2: { draw: (t, d, c) => msg(t, d, c, true), cams: [{ z: 1.35, cx: 540, cy: 720 }], single: true },
  behind: { draw: behind, cams: [{ z: 1.0, cx: 540, cy: 960 }], single: true, shake: 0 },
  end: { draw: endcard, cams: [{ z: 1.0, cx: 540, cy: 960 }], single: true },
};

module.exports = { SCENES };
