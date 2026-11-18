// "Welcher Biss zerquetscht einen Schiffscontainer?" – 2D-Cartoon, komplett prozedural (Canvas 2D)
const cv = document.getElementById('c'), g = cv.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const lerp = (a, b, k) => a + (b - a) * k;
const eOut = k => 1 - Math.pow(1 - clamp(k), 3), eIn = k => Math.pow(clamp(k), 3), eIO = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const back = k => { k = clamp(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const fmt = n => Math.round(n).toLocaleString('de-DE');
const OX = 420, OY = 1000, FLOOR = 1335; let TL, R;
const C = { ink: '#16181f', bg1: '#1a2340', bg2: '#2b3b62', yel: '#ffc83d', red: '#ff4f45', grn: '#3fd47a', white: '#f6f3ea' };

// ---------- Zeichen-Helfer ----------
function smoothPath(pts, closed = true) { // Catmull-Rom -> Bezier
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a0 = !closed && i === 0 ? p1 : p0, a3 = !closed && i === n - 2 ? p2 : p3;
    g.bezierCurveTo(p1[0] + (p2[0] - a0[0]) / 6, p1[1] + (p2[1] - a0[1]) / 6, p2[0] - (a3[0] - p1[0]) / 6, p2[1] - (a3[1] - p1[1]) / 6, p2[0], p2[1]); }
  if (closed) g.closePath(); }
function polyPath(pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
function fillStroke(fill, lw, stroke = C.ink) { g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); } }
function text(s, x, y, size, color = '#fff', { w = 900, align = 'center', stroke = 0, sc = C.ink, base = 'middle' } = {}) {
  g.font = `${w} ${size}px M, "Noto Color Emoji", sans-serif`; g.textAlign = align; g.textBaseline = base;
  if (stroke) { g.lineWidth = stroke; g.strokeStyle = sc; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = color; g.fillText(s, x, y); }
function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------- Köpfe (lokale Einheiten: Gelenk bei 0,0, Maul zeigt nach links, y nach unten) ----------
const sx = (pts, fy = 1) => pts.map(([x, y]) => [x, y * fy]);
const CROC_U = [[2.8, -0.5], [1.2, -0.46], [0.5, -0.4], [0.2, -0.43], [0.04, -0.54], [-0.12, -0.5], [-0.22, -0.37], [-0.5, -0.25], [-0.85, -0.18], [-0.98, -0.21], [-1.07, -0.15], [-1.08, -0.05], [-1.0, 0.0], [-0.5, 0.0], [0.0, 0.0], [0.3, 0.02], [2.8, 0.05]];
const CROC_L = [[2.8, 0.05], [0.3, 0.02], [0, 0], [-0.5, 0], [-0.98, 0], [-1.04, 0.05], [-0.98, 0.12], [-0.6, 0.13], [-0.2, 0.17], [0.3, 0.25], [1.0, 0.32], [2.8, 0.36]];
const DEINO_U = [[2.8, -0.62], [1.2, -0.58], [0.5, -0.5], [0.2, -0.54], [0.04, -0.66], [-0.12, -0.62], [-0.24, -0.46], [-0.5, -0.32], [-0.8, -0.25], [-0.93, -0.3], [-1.08, -0.27], [-1.13, -0.12], [-1.05, 0.0], [-0.5, 0.0], [0.0, 0.0], [0.3, 0.02], [2.8, 0.05]];
const DEINO_L = [[2.8, 0.05], [0.3, 0.02], [0, 0], [-0.5, 0], [-1.02, 0], [-1.08, 0.07], [-1.0, 0.16], [-0.6, 0.17], [-0.2, 0.22], [0.3, 0.3], [1.0, 0.38], [2.8, 0.42]];
const SHARK_U = [[2.8, -0.78], [1.3, -0.74], [0.45, -0.64], [-0.2, -0.5], [-0.65, -0.36], [-0.95, -0.22], [-1.06, -0.1], [-1.0, 0.0], [-0.88, 0.05], [-0.74, 0.02], [-0.4, 0.0], [0.0, 0.0], [0.4, 0.05], [2.8, 0.1]];
const SHARK_L = [[2.8, 0.1], [0.4, 0.05], [0, 0], [-0.4, 0], [-0.72, 0.02], [-0.75, 0.08], [-0.62, 0.18], [-0.3, 0.28], [0.2, 0.38], [1.0, 0.47], [2.8, 0.52]];
const REX_U = [[2.6, -0.58], [1.3, -0.6], [0.5, -0.68], [0.15, -0.66], [-0.12, -0.6], [-0.27, -0.63], [-0.44, -0.52], [-0.78, -0.41], [-0.97, -0.33], [-1.06, -0.2], [-1.05, -0.06], [-0.98, 0.0], [-0.5, 0.0], [0.0, 0.0], [0.35, 0.04], [2.6, 0.1]];
const REX_L = [[2.6, 0.1], [0.35, 0.04], [0, 0], [-0.5, 0], [-0.95, 0], [-0.99, 0.06], [-0.9, 0.15], [-0.5, 0.21], [-0.1, 0.28], [0.25, 0.37], [1.0, 0.5], [2.6, 0.56]];
function teethRow(x0, x1, n, l0, l1, big = []) { const r = []; for (let i = 0; i < n; i++) { const k = i / (n - 1); const x = lerp(x0, x1, k); let l = lerp(l0, l1, k); for (const [bx, bl] of big) if (Math.abs(x - bx) < 0.05) l = bl; r.push([x, l]); } return r; }
const HEADS = {
  croc: { U: CROC_U, L: CROC_L, top: '#6f8c45', dark: '#4f6a2f', belly: '#ddd59c', S: 520, xm: -0.6, Uo: 0.24, Do: 0.5, tooth: 'cone', ut: teethRow(-1.0, -0.14, 13, 0.06, 0.05, [[-0.86, 0.1], [-0.57, 0.085]]), lt: teethRow(-0.95, -0.18, 12, 0.05, 0.045, [[-0.93, 0.09]]), eye: [-0.07, -0.46, 0.05, '#d9b23a'], nos: [-1.0, -0.17] },
  deino: { U: DEINO_U, L: DEINO_L, top: '#6a604c', dark: '#463e30', belly: '#cbbd98', S: 860, xm: -0.6, Uo: 0.24, Do: 0.5, tooth: 'cone', ut: teethRow(-1.04, -0.14, 13, 0.07, 0.055, [[-0.9, 0.11], [-0.6, 0.095]]), lt: teethRow(-0.99, -0.18, 12, 0.055, 0.05, [[-0.97, 0.1]]), eye: [-0.07, -0.58, 0.045, '#c9a032'], nos: [-1.04, -0.24] },
  shark: { U: SHARK_U, L: SHARK_L, top: '#7d8ea0', dark: '#5e6e80', belly: '#eef1f2', S: 640, xm: -0.42, Uo: 0.13, Do: 0.62, tooth: 'tri', ut: teethRow(-0.72, -0.06, 11, 0.085, 0.05), lt: teethRow(-0.7, -0.08, 10, 0.07, 0.045), eye: [-0.55, -0.3, 0.042, '#0b0b0d'], nos: [-0.88, -0.13], gills: true, jf: -0.73 },
  mega: { U: SHARK_U, L: SHARK_L, top: '#566577', dark: '#3f4b5a', belly: '#dfe4e7', S: 1060, xm: -0.42, Uo: 0.13, Do: 0.62, tooth: 'tri', ut: teethRow(-0.72, -0.06, 10, 0.1, 0.06), lt: teethRow(-0.7, -0.08, 9, 0.085, 0.055), eye: [-0.55, -0.3, 0.036, '#0b0b0d'], nos: [-0.88, -0.13], gills: true, scars: true, jf: -0.73 },
  trex: { U: REX_U, L: REX_L, top: '#b08b5f', dark: '#7d5a3a', belly: '#eadbbb', S: 720, xm: -0.56, Uo: 0.2, Do: 0.55, tooth: 'banana', ut: teethRow(-0.96, -0.1, 11, 0.1, 0.07, [[-0.7, 0.13]]), lt: teethRow(-0.9, -0.14, 10, 0.075, 0.06), eye: [-0.28, -0.46, 0.045, '#f0a020'], nos: [-0.96, -0.24], stripes: true, jf: -0.97 },
};
// Haut "skinnen": Punkte nahe dem Maul drehen mit dem Kiefer, Hals bleibt fest
const wU = x => clamp((0.45 - x) / 0.45), wL = x => clamp((0.4 - x) / 0.4);
const rot = (p, a, w) => { const c = Math.cos(a * w), s = Math.sin(a * w); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const skinU = (pts, au) => pts.map(p => rot(p, au, wU(p[0]))), skinL = (pts, ad) => pts.map(p => rot(p, ad, wL(p[0])));
// Kontakt-Öffnung: bei welcher Öffnung o berühren die Zahnspitzen ein Objekt der halben Höhe h (px)?
function contactO(hd, h) { const S = hd.S, xm = Math.abs(hd.xm); const tl = 0.06 * S; let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const o = (lo + hi) / 2; const gap = xm * S * (Math.sin(o * hd.Uo) + Math.sin(o * hd.Do)) - 1.1 * tl; if (gap > 2 * h) hi = o; else lo = o; } return hi; }
function drawTooth(kind, l, up, bw = 0.4) { // im lokalen Zahn-Rahmen: Wurzel bei 0, zeigt nach +y (unten) bzw. -y
  const d = up ? -1 : 1; g.beginPath();
  if (kind === 'tri') { g.moveTo(-l * bw, 0); for (let k = 1; k <= 4; k++) g.lineTo(-l * bw * (1 - k / 4) + (k % 2 ? 0.006 : -0.004), d * l * k / 4); g.lineTo(0, d * l); for (let k = 3; k >= 0; k--) g.lineTo(l * bw * (1 - k / 4) + (k % 2 ? -0.006 : 0.004), d * l * k / 4); }
  else if (kind === 'banana') { g.moveTo(-l * 0.32, 0); g.quadraticCurveTo(-l * 0.3, d * l * 0.7, l * 0.18, d * l); g.quadraticCurveTo(l * 0.32, d * l * 0.5, l * 0.32, 0); }
  else { g.moveTo(-l * 0.28, 0); g.quadraticCurveTo(-l * 0.18, d * l * 0.75, 0, d * l); g.quadraticCurveTo(l * 0.18, d * l * 0.75, l * 0.28, 0); }
  g.closePath(); }
function headBack(hd, hx, hy, o) { // Maulinneres (hinter dem Objekt)
  const au = o * hd.Uo, ad = -o * hd.Do; g.save(); g.translate(hx, hy); g.scale(hd.S, hd.S);
  const jf = hd.jf || -1.0; const upLine = [], loLine = []; for (let x = jf; x <= 0.2; x += 0.04) { upLine.push(rot([x, 0.0], au, wU(x))); loLine.push(rot([x, 0.0], ad, wL(x))); }
  polyPath([...upLine, ...loLine.reverse()]); g.fillStyle = '#3b1015'; g.fill();
  const tg = []; const tf0 = Math.max(-0.8, jf + 0.12); for (let x = tf0; x <= 0.1; x += 0.05) tg.push(rot([x, -0.015], ad, wL(x))); for (let x = 0.1; x >= tf0; x -= 0.05) tg.push(rot([x, -0.06 - 0.02 * Math.sin((x + 0.8) * 3)], ad, wL(x)));
  polyPath(tg); g.fillStyle = '#a5404c'; g.fill(); g.restore(); }
function headFront(hd, hx, hy, o, T) {
  const au = o * hd.Uo, ad = -o * hd.Do; const S = hd.S, lw = 7 / S; g.save(); g.translate(hx, hy); g.scale(S, S);
  const tooth = (x, l, up, a, w) => { const p = rot([x, 0], a, w); g.save(); g.translate(p[0], p[1]); g.rotate(a * w); drawTooth(hd.tooth, l, up); g.fillStyle = C.white; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = C.ink; g.stroke(); g.restore(); };
  hd.ut.forEach(([x, l]) => tooth(x, l, false, au, wU(x)));
  // Unterkiefer
  const L = skinL(hd.L, ad); smoothPath(L); const gl = g.createLinearGradient(0, 0, 0, 0.45); gl.addColorStop(0, hd.top); gl.addColorStop(0.35, hd.belly); gl.addColorStop(1, hd.belly); fillStroke(gl, lw);
  // Unterkiefer-Zähne (verschwinden beim Zubeißen hinter der Oberlippe)
  hd.lt.forEach(([x, l]) => tooth(x + 0.03, l, true, ad, wL(x)));
  // Oberkopf
  const U = skinU(hd.U, au); smoothPath(U); const gu = g.createLinearGradient(0, -0.75, 0, 0.05); gu.addColorStop(0, hd.dark); gu.addColorStop(0.45, hd.top); gu.addColorStop(1, hd.top); fillStroke(gu, lw);
  g.save(); smoothPath(U); g.clip(); // Details im Oberkopf
  if (hd.gills) { g.fillStyle = hd.belly; const cs = [[0.0, 0.0], [0.4, 0.05], [2.8, 0.1], [2.8, -0.12], [1.6, -0.1], [1.0, -0.16], [0.7, -0.09], [0.4, -0.12], [0.1, -0.06]].map(p => rot(p, au, wU(p[0]))); smoothPath(cs); g.fill(); }
  if (hd.stripes) { g.fillStyle = hd.dark; g.globalAlpha = 0.5; for (const sx0 of [0.2, 0.55, 0.9, 1.3, 1.7]) { const st = [[sx0, -0.75], [sx0 + 0.1, -0.75], [sx0 + 0.02, -0.3], [sx0 - 0.04, -0.3]].map(p => rot(p, au, wU(p[0]))); polyPath(st); g.fill(); } g.globalAlpha = 1; }
  if (hd === HEADS.croc || hd === HEADS.deino) { // Knochenhöcker auf dem Rücken + Schnauze
    g.fillStyle = hd.dark; const rr = rng(hd === HEADS.croc ? 3 : 4); for (let x = -0.9; x < 2.8; x += 0.09) { const y = x > 0.2 ? (hd === HEADS.croc ? -0.46 : -0.56) : lerp(-0.2, -0.36, clamp((x + 0.9) / 0.7)); const p = rot([x, y + 0.035], au, wU(x)); g.beginPath(); g.ellipse(p[0], p[1], 0.03 + rr() * 0.012, 0.016, 0, 0, 7); g.fill(); }
    g.globalAlpha = 0.35; for (let k = 0; k < 70; k++) { const x = -1 + rr() * 3.6, y = -0.5 + rr() * 0.45; const p = rot([x, y], au, wU(x)); g.beginPath(); g.ellipse(p[0], p[1], 0.022, 0.014, 0, 0, 7); g.fill(); } g.globalAlpha = 1; }
  if (hd.scars) { g.strokeStyle = '#c9ced3'; g.lineWidth = 0.008; g.globalAlpha = 0.7; for (const [x, y, l] of [[-0.3, -0.42, 0.18], [0.1, -0.5, 0.25], [-0.1, -0.35, 0.12]]) { const a = rot([x, y], au, wU(x)), b = rot([x + l, y - 0.06], au, wU(x + l)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.globalAlpha = 1; }
  g.restore(); smoothPath(U); g.lineWidth = lw; g.strokeStyle = C.ink; g.stroke();
  if (hd.gills) { g.strokeStyle = 'rgba(30,35,45,0.55)'; g.lineWidth = 0.012; for (const x of [0.75, 0.9, 1.05, 1.2]) { g.beginPath(); g.moveTo(x, -0.38); g.quadraticCurveTo(x - 0.06, -0.1, x + 0.02, 0.2); g.stroke(); } }
  // Auge
  { const [ex, ey, er, col] = hd.eye; const p = rot([ex, ey], au, wU(ex)); g.beginPath(); g.ellipse(p[0], p[1], er, er, 0, 0, 7); fillStroke(col, lw * 0.8);
    if (!hd.gills) { g.beginPath(); g.ellipse(p[0] + er * 0.1, p[1], er * 0.28, er * 0.85, 0, 0, 7); g.fillStyle = '#111'; g.fill(); }
    g.beginPath(); g.arc(p[0] - er * 0.35, p[1] - er * 0.35, er * 0.25, 0, 7); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.moveTo(p[0] - er * 1.6, p[1] - er * 1.0); g.quadraticCurveTo(p[0], p[1] - er * 2.0, p[0] + er * 1.6, p[1] - er * 0.9); g.lineWidth = lw * 1.2; g.strokeStyle = C.ink; g.stroke(); }
  { const [nx, ny] = hd.nos; const p = rot([nx, ny], au, wU(nx)); g.beginPath(); g.ellipse(p[0], p[1], 0.022, 0.011, -0.3, 0, 7); g.fillStyle = C.ink; g.fill(); }
  g.restore(); }

// ---------- Objekte ----------
const OBJ = { kokos: { w: 170, h: 160 }, bowling: { w: 180, h: 180 }, auto: { w: 440, h: 200 }, tresor: { w: 270, h: 260 }, container: { w: 660, h: 300 } };
const PAL = { kokos: ['#6b4423', '#4e2f17', '#f4efe2', '#8a5a2e'], bowling: ['#4a2a7a', '#2e1a52', '#7a52b8', '#1c1030'], auto: ['#f2c230', '#d9a20f', '#9fd3ea', '#2b2b2b'], tresor: ['#6f7f94', '#4f5d70', '#9aa8b8', '#2f3846'], container: ['#2f72b8', '#215691', '#5b95d1', '#183c66'] };
function drawObj(type, cx, cy, sq = 1, crack = 0) {
  const o = OBJ[type], w = o.w, h = o.h; g.save(); g.translate(cx, cy + h / 2 * (1 - sq)); g.scale(1 + (1 - sq) * 0.45, sq); const lw = 6;
  if (type === 'kokos') { g.beginPath(); g.ellipse(0, 0, w / 2, h / 2, 0.15, 0, 7); const gr = g.createRadialGradient(-25, -30, 10, 0, 0, 90); gr.addColorStop(0, '#8a5a2e'); gr.addColorStop(1, '#4e2f17'); fillStroke(gr, lw);
    g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 3; const r = rng(5); for (let k = 0; k < 26; k++) { const a = r() * 7, d = r() * 70; g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d * 0.9); g.lineTo(Math.cos(a) * d + 14, Math.sin(a) * d * 0.9 + 6); g.stroke(); }
    for (const [x, y] of [[-30, -20], [-8, -38], [-42, 4]]) { g.beginPath(); g.ellipse(x, y, 9, 11, 0, 0, 7); g.fillStyle = '#2a170a'; g.fill(); } }
  if (type === 'bowling') { g.beginPath(); g.arc(0, 0, w / 2, 0, 7); const gr = g.createRadialGradient(-35, -40, 8, 0, 0, 95); gr.addColorStop(0, '#9a72d8'); gr.addColorStop(0.5, '#4a2a7a'); gr.addColorStop(1, '#22123e'); fillStroke(gr, lw);
    g.fillStyle = 'rgba(140,90,210,0.35)'; for (const [x, y, r2] of [[30, 20, 26], [-20, 40, 18], [40, -30, 14]]) { g.beginPath(); g.arc(x, y, r2, 0, 7); g.fill(); }
    for (const [x, y, r2] of [[-18, -38, 13], [10, -40, 13], [-4, -8, 15]]) { g.beginPath(); g.arc(x, y, r2, 0, 7); fillStroke('#120a20', 3); }
    g.beginPath(); g.ellipse(-38, -44, 22, 12, -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
  if (type === 'auto') { const body = [[-220, 60], [-220, 0], [-200, -20], [-120, -30], [-80, -95], [60, -95], [120, -35], [205, -22], [220, 10], [220, 60]];
    smoothPath(body); fillStroke('#f2c230', lw); g.beginPath(); g.moveTo(-70, -82); g.lineTo(-10, -82); g.lineTo(-10, -35); g.lineTo(-108, -35); g.closePath(); fillStroke('#9fd3ea', 4); g.beginPath(); g.moveTo(5, -82); g.lineTo(55, -82); g.lineTo(102, -35); g.lineTo(5, -35); g.closePath(); fillStroke('#9fd3ea', 4);
    g.fillStyle = '#d9a20f'; g.fillRect(-215, 18, 430, 14); g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(-208, -2, 9, 12, 0, 0, 7); g.fill(); g.fillStyle = '#ff5a40'; g.fillRect(208, -8, 10, 20);
    g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(-10, -35); g.lineTo(-10, 50); g.moveTo(5, -35); g.lineTo(5, 50); g.stroke();
    for (const x of [-130, 130]) { g.beginPath(); g.arc(x, 62, 42, 0, 7); fillStroke('#2b2b2b', lw); g.beginPath(); g.arc(x, 62, 18, 0, 7); fillStroke('#bfc5cc', 3); } }
  if (type === 'tresor') { rrect(-w / 2, -h / 2, w, h, 16); const gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); gr.addColorStop(0, '#8392a6'); gr.addColorStop(1, '#4f5d70'); fillStroke(gr, lw);
    rrect(-w / 2 + 22, -h / 2 + 22, w - 44, h - 44, 10); fillStroke('#6f7f94', 4); g.beginPath(); g.arc(-10, 0, 48, 0, 7); fillStroke('#c9d2dc', 5); g.beginPath(); g.arc(-10, 0, 14, 0, 7); fillStroke('#2f3846', 3);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(-10 + Math.cos(a) * 34, Math.sin(a) * 34); g.lineTo(-10 + Math.cos(a) * 44, Math.sin(a) * 44); g.lineWidth = 3; g.stroke(); }
    g.fillStyle = '#2f3846'; g.fillRect(70, -40, 18, 80); for (const [x, y] of [[-110, -110], [110, -110], [-110, 110], [110, 110]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fillStyle = '#c9d2dc'; g.fill(); } }
  if (type === 'container') { rrect(-w / 2, -h / 2, w, h, 6); fillStroke('#2f72b8', lw);
    for (let x = -w / 2 + 26; x < w / 2 - 10; x += 26) { g.fillStyle = 'rgba(15,40,80,0.35)'; g.fillRect(x, -h / 2 + 18, 9, h - 36); g.fillStyle = 'rgba(140,190,240,0.25)'; g.fillRect(x + 9, -h / 2 + 18, 5, h - 36); }
    g.fillStyle = '#215691'; g.fillRect(-w / 2, -h / 2, w, 18); g.fillRect(-w / 2, h / 2 - 18, w, 18); g.fillRect(-w / 2, -h / 2, 22, h); g.fillRect(w / 2 - 22, -h / 2, 22, h);
    rrect(-w / 2, -h / 2, w, h, 6); g.lineWidth = lw; g.strokeStyle = C.ink; g.stroke(); text('40 FT', -w / 2 + 120, -h / 2 + 60, 34, 'rgba(255,255,255,0.85)', { w: 800 }); }
  if (crack > 0) { g.strokeStyle = C.ink; g.lineWidth = 5; g.lineCap = 'round'; const r = rng(type.length * 7); const n = Math.ceil(crack * 5);
    for (let k = 0; k < n; k++) { let x = (r() - 0.5) * w * 0.5, y = -h / 2 + 4 + (k % 2) * (h - 8) * 0.0; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 40; y += h * 0.13 * crack; g.lineTo(x, y); } g.stroke(); } }
  g.restore(); }
// Splitter beim Zerbrechen
function shards(type, cx, cy, dt, big = 1) { if (dt < 0 || dt > 2.2) return; const o = OBJ[type], pal = PAL[type], r = rng(type.length * 31 + 7); const n = Math.round(30 * big);
  for (let k = 0; k < n; k++) { const sz = (14 + r() * 34) * Math.sqrt(o.w / 200) * (type === 'container' ? 1.3 : 1); const x0 = cx + (r() - 0.5) * o.w * 0.8, y0 = cy + (r() - 0.5) * o.h * 0.6;
    const vx = (r() - 0.5) * 1500 * big, vy = -300 - r() * 900 * big, va = (r() - 0.5) * 16; const x = x0 + vx * dt, y = y0 + vy * dt + 1300 * dt * dt; const yy = Math.min(y, FLOOR - 6);
    g.save(); g.globalAlpha = clamp(1.5 - dt * 0.75); g.translate(x, yy); g.rotate(va * dt + k); const m = 3 + (k % 3); g.beginPath(); for (let j = 0; j < m; j++) { const a = j / m * Math.PI * 2, rr = sz * (0.6 + 0.4 * ((k * 7 + j * 3) % 5) / 4); j ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8); } g.closePath(); fillStroke(pal[k % pal.length], 3); g.restore(); }
  for (let k = 0; k < 16 * big; k++) { const a = r() * Math.PI * 2, sp = 200 + r() * 500; const d = sp * dt * (1 - dt * 0.3); g.globalAlpha = clamp(0.6 - dt * 0.4); g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6, (20 + r() * 40) * (0.5 + dt), 0, 7); g.fillStyle = '#d8d0c0'; g.fill(); } g.globalAlpha = 1; }

// ---------- Kulisse ----------
function background() {
  const gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, C.bg1); gr.addColorStop(1, C.bg2); g.fillStyle = gr; g.fillRect(0, 0, W, FLOOR);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 3; for (let x = 60; x < W; x += 160) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FLOOR); g.stroke(); } for (let y = 120; y < FLOOR; y += 240) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 60; x < W; x += 160) for (let y = 120; y < FLOOR; y += 240) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill(); }
  const sp = g.createRadialGradient(OX + 120, 900, 50, OX + 120, 900, 820); sp.addColorStop(0, 'rgba(255,225,170,0.22)'); sp.addColorStop(1, 'rgba(255,225,170,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, FLOOR);
  const fg = g.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, '#2a3149'); fg.addColorStop(1, '#10131d'); g.fillStyle = fg; g.fillRect(0, FLOOR, W, H - FLOOR);
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(W / 2 + k * 90, FLOOR); g.lineTo(W / 2 + k * 260, H); g.stroke(); }
  g.fillStyle = C.yel; g.fillRect(0, FLOOR - 6, W, 12); }
function pedestal(topY) { const x = OX; // Prüfstand: Säule + Platte + Warnstreifen-Sockel
  g.fillStyle = '#4b5873'; g.fillRect(x - 38, topY + 14, 76, FLOOR - topY - 14); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x - 30, topY + 14, 14, FLOOR - topY - 14);
  g.strokeStyle = C.ink; g.lineWidth = 6; g.strokeRect(x - 38, topY + 14, 76, FLOOR - topY - 14);
  rrect(x - 150, topY, 300, 26, 8); fillStroke('#8a97b0', 6);
  g.save(); rrect(x - 170, FLOOR - 70, 340, 70, 10); g.clip(); g.fillStyle = C.yel; g.fillRect(x - 170, FLOOR - 70, 340, 70); g.fillStyle = C.ink; for (let k = -10; k < 12; k++) { g.beginPath(); g.moveTo(x - 170 + k * 40, FLOOR); g.lineTo(x - 150 + k * 40, FLOOR); g.lineTo(x - 110 + k * 40, FLOOR - 70); g.lineTo(x - 130 + k * 40, FLOOR - 70); g.fill(); } g.restore();
  rrect(x - 170, FLOOR - 70, 340, 70, 10); g.lineWidth = 6; g.strokeStyle = C.ink; g.stroke(); }

// ---------- Anzeige ----------
function gauge(val, rec, flash, failK) {
  const y0 = 1430; rrect(50, y0, 980, 380, 34); g.fillStyle = 'rgba(10,13,24,0.88)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#39456a'; g.stroke();
  text('BISSKRAFT', W / 2, y0 + 52, 40, '#9fb0d8', { w: 800 });
  const col = failK > 0 ? `rgb(255,${Math.round(lerp(255, 90, failK))},${Math.round(lerp(255, 80, failK))})` : flash > 0 ? `rgb(${Math.round(lerp(255, 120, flash))},255,${Math.round(lerp(255, 150, flash))})` : '#fff';
  text(fmt(val) + ' kg', W / 2, y0 + 150, 128, col, { stroke: 12 });
  const bx = 100, bw = 880, by = y0 + 240, bh = 50, MAX = 20000; rrect(bx, by, bw, bh, 25); g.fillStyle = '#1f2640'; g.fill();
  const k = clamp(val / MAX); if (k > 0.002) { g.save(); rrect(bx, by, bw, bh, 25); g.clip(); const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, C.grn); gr.addColorStop(0.5, C.yel); gr.addColorStop(1, C.red); g.fillStyle = gr; g.fillRect(bx, by, bw * k, bh); g.restore(); }
  rrect(bx, by, bw, bh, 25); g.lineWidth = 5; g.strokeStyle = '#5a6890'; g.stroke();
  for (let v = 0; v <= MAX; v += 5000) { const x = bx + bw * v / MAX; g.fillStyle = '#5a6890'; g.fillRect(x - 2, by + bh + 6, 4, 14); text(v ? fmt(v) : '0', x, by + bh + 44, 28, '#8090b8', { w: 700 }); }
  if (rec > 0) { const x = bx + bw * clamp(rec / MAX); g.fillStyle = C.yel; g.fillRect(x - 3, by - 14, 6, bh + 28); text('Rekord', x, by - 30, 26, C.yel, { w: 800 }); } }
function board(T) { // Rekordliste oben links
  const done = R.filter(r => T >= r.crush); const fin = R[R.length - 1].final; const k0 = eOut((T - 1.9) / 0.4) * clamp(1 - (T - fin) / 0.3); if (k0 <= 0) return;
  const x = 40, y = 360; g.globalAlpha = k0; rrect(x, y, 470, 70 + 62 * Math.max(1, done.length), 24); g.fillStyle = 'rgba(10,13,24,0.8)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#39456a'; g.stroke();
  text('ZERBISSEN', x + 24, y + 38, 32, C.yel, { align: 'left', w: 900 });
  done.forEach((r, i) => { const a = eOut((T - r.crush) / 0.35); const yy = y + 100 + i * 62; g.globalAlpha = k0 * a; const xo = (1 - a) * -60;
    text(r.emoji, x + 46 + xo, yy, 38); text(r.name, x + 84 + xo, yy, 26, '#fff', { align: 'left', w: 800 }); text(fmt(r.kg), x + 450 + xo, yy, 30, i === done.length - 1 ? C.grn : '#c9d3ee', { align: 'right', w: 900 }); });
  g.globalAlpha = 1; }
function stamp(s, x, y, color, k, ang = -0.12, size = 92) { if (k <= 0) return; const sc = lerp(2.2, 1, eOut(k * 3)); const a = clamp(k * 5) * clamp((1 - k) * 4);
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(ang); g.scale(sc, sc); g.font = `900 ${size}px M`; const tw = g.measureText(s).width;
  rrect(-tw / 2 - 30, -size * 0.75, tw + 60, size * 1.5, 18); g.fillStyle = 'rgba(15,15,20,0.75)'; g.fill(); g.lineWidth = 10; g.strokeStyle = color; g.stroke(); text(s, 0, 4, size, color); g.restore(); }

// ---------- Ablauf ----------
function stateAt(T) { // aktuelle Runde + Kieferöffnung + Objekte
  let ri = 0; for (let i = 0; i < R.length; i++) if (T >= R[i].t0 - 0.05) ri = i; const r = R[ri], hd = HEADS[r.id];
  const objA = OBJ[r.A], objB = r.B ? OBJ[r.B] : null; const oA = contactO(hd, objA.h / 2), oB = objB ? contactO(hd, objB.h / 2) : 0;
  let o = 1, objType = r.A, objX = OX, sq = 1, crack = 0, crushed = T >= r.crush, shake = 0, val = 0, flash = 0, failK = 0, curH = objA.h;
  const tb = r.tb, tc = r.crush;
  // Öffnung beim Hereinkommen
  o = lerp(0.35, 1, eOut((T - r.t0 - 0.25) / 0.4));
  if (T >= tb) { const k1 = eIn((T - tb) / 0.12); o = lerp(1, oA, k1);
    if (T >= tb + 0.12) { const ks = clamp((T - tb - 0.12) / (tc - tb - 0.12)); o = lerp(oA, oA * 0.72, eIn(ks)); shake = 3 + ks * 5; sq = lerp(1, 0.78, eIn(ks)); val = r.kg * eOut(clamp((T - tb) / (tc - tb))) ; }
    if (T >= tc) { o = lerp(oA * 0.72, 0, eOut((T - tc) / 0.07)); val = r.kg; flash = clamp(1 - (T - tc) / 0.6); shake = 0; }
    if (T >= tc + 0.55 && r.B) o = lerp(0, 1, eIO((T - tc - 0.55) / 0.3)); if (!r.B && T >= tc + 0.2) o = 0.05 + 0.04 * Math.sin((T - tc) * 5); }
  let objVisible = T < tc;
  if (r.B && T >= r.swap) { objType = r.B; curH = objB.h; objVisible = true; objX = lerp(-500, OX, eOut((T - r.swap) / 0.45)); sq = 1; crushed = false; val = r.kg * clamp(1 - (T - r.swap) / 0.4);
    const tf = r.tf; if (T >= tf) { const k1 = eIn((T - tf) / 0.12); o = lerp(1, oB, k1);
      if (T >= tf + 0.12) { o = oB * (1 + 0.03 * Math.sin(T * 90)); shake = 6; crack = clamp((T - tf - 0.2) / 0.5); }
      val = r.kg * eOut(clamp((T - tf) / 0.35)) * (1 + 0.012 * Math.sin(T * 70)); failK = clamp((T - tf - 0.35) / 0.2);
      if (T >= tf + 0.95) { o = lerp(oB, 1, eIO((T - tf - 0.95) / 0.2)); shake = 0; val = r.kg * clamp(1 - (T - tf - 0.95) / 0.3); failK = clamp(1 - (T - tf - 0.95) / 0.3); crack = 1; } } }
  // Kopfposition
  const Hh = curH / 2, d = Hh * (hd.Do - hd.Uo) / (hd.Do + hd.Uo); let hx = OX + Math.abs(hd.xm) * hd.S, hy = OY - d;
  if (r.B && T >= r.swap && T < r.swap + 0.5) { const Ha = objA.h / 2, da = Ha * (hd.Do - hd.Uo) / (hd.Do + hd.Uo); hy = lerp(OY - da, OY - d, eIO((T - r.swap) / 0.5)); }
  hx += (1 - eOut((T - r.t0) / 0.5)) * 1300; if (r.exit && T > r.exit) { hx += eIn((T - r.exit) / 0.4) * 1500; o = lerp(1, 0.4, clamp((T - r.exit) / 0.3)); }
  return { r, ri, hd, o, hx, hy, objType, objX, objVisible, sq, crack, shake, val, flash, failK };
}
function renderAt(T) {
  const st = stateAt(T); const { r, hd } = st; let rec = 0; R.forEach(q => { if (T >= q.crush) rec = q.kg; });
  // Kamera-Wackeln bei Treffern
  let shx = 0, shy = 0; for (const q of R) { const dt = T - q.crush; if (dt > 0 && dt < 0.6) { const a = (q.id === 'mega' ? 38 : 16) * Math.exp(-dt * 9); shx += a * Math.sin(dt * 80); shy += a * Math.cos(dt * 67); } }
  shx += st.shake * Math.sin(T * 97); shy += st.shake * 0.6 * Math.cos(T * 83);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.save(); g.translate(shx, shy); background();
  // Intro: Kokosnuss fährt ein
  let objX = st.objX; if (st.ri === 0 && T < r.t0 + 0.3) objX = lerp(-400, OX, eOut((T - 1.2) / 0.5));
  const o = OBJ[st.objType]; const objY = OY, PLATE = 1160; pedestal(PLATE);
  headBack(hd, st.hx, st.hy, st.o);
  if (st.objVisible) { // Objekt sitzt auf einem Hubstempel, der zur Plattform hochreicht
    const by = objY + o.h / 2; if (by < PLATE) { const sx0 = objX; g.fillStyle = '#6a7894'; g.fillRect(sx0 - 22, by, 44, PLATE - by); g.lineWidth = 5; g.strokeStyle = C.ink; g.strokeRect(sx0 - 22, by, 44, PLATE - by); }
    drawObj(st.objType, objX, objY, st.sq, st.crack); }
  headFront(hd, st.hx, st.hy, st.o, T);
  for (const q of R) shards(q.A, OX, OY, T - q.crush, q.id === 'mega' ? 1.8 : 1);
  g.restore();
  // UI
  const finK = r.final ? clamp((T - r.final) / 0.3) : 0; const tk = eOut((T - 1.5) / 0.6); // Titel: groß in der Mitte -> klein oben
  { const ty = lerp(560, 150, tk), sc = lerp(1, 0.56, tk); const pop = back(T / 0.5); g.save(); g.globalAlpha = 1 - finK; g.translate(W / 2, ty); g.scale(sc * pop, sc * pop);
    rrect(-470, -150, 940, 300, 40); g.fillStyle = 'rgba(10,13,24,0.88)'; g.fill(); g.lineWidth = 8; g.strokeStyle = C.yel; g.stroke();
    text('Welcher Biss', 0, -82, 84, '#fff', { stroke: 0 }); text('zerquetscht einen', 0, 6, 70, '#fff'); text('SCHIFFSCONTAINER?', 0, 92, 78, C.yel); g.restore(); g.globalAlpha = 1; }
  if (T < 1.9) { const k = eOut((T - 0.35) / 0.5) * clamp((1.9 - T) / 0.3); g.save(); g.globalAlpha = k; g.translate(W / 2, 900); g.scale(0.55, 0.55); drawObj('container', 0, 0); g.restore(); g.globalAlpha = 1; }
  board(T);
  // Name des Tiers
  { const k = eOut((T - r.t0 - 0.15) / 0.35) * (r.exit ? clamp(1 - (T - r.exit) / 0.25) : 1) * (1 - finK); if (k > 0 && T > 2) { g.save(); g.globalAlpha = k; const y = 300, x = W / 2 + 230 - (1 - k) * -80;
      g.font = '900 64px M'; const tw = Math.max(g.measureText(r.name).width, 300); rrect(x - tw / 2 - 30, y - 50, tw + 60, 130, 22); g.fillStyle = 'rgba(10,13,24,0.88)'; g.fill(); g.lineWidth = 6; g.strokeStyle = C.yel; g.stroke();
      text(r.name, x, y, 64, '#fff'); text('≈ ' + fmt(r.kg) + ' kg · ' + r.note, x, y + 52, 30, '#c9d3ee', { w: 700 }); g.restore(); } }
  gauge(st.val, rec, st.flash, st.failK);
  stamp('ZERQUETSCHT!', W / 2, 760, C.grn, (T - r.crush) / 0.9, -0.1, r.id === 'mega' ? 100 : 84);
  if (r.tf) stamp('HÄLT!', W / 2 - 80, 760, C.red, (T - r.tf - 0.35) / 0.9, 0.12, 110);
  if (r.final) { const k = eOut((T - r.final) / 0.5); if (k > 0) { g.save(); g.globalAlpha = k; g.translate(W / 2, 330); g.scale(lerp(0.6, 1, back((T - r.final) / 0.5)), lerp(0.6, 1, back((T - r.final) / 0.5)));
      rrect(-470, -170, 940, 340, 40); g.fillStyle = 'rgba(10,13,24,0.92)'; g.fill(); g.lineWidth = 10; g.strokeStyle = C.yel; g.stroke();
      text('🦈 MEGALODON', 0, -90, 72, '#fff'); text('≈ 18.600 kg', 0, 10, 110, C.yel, { stroke: 10 }); text('zerquetscht den Container!', 0, 110, 50, '#fff', { w: 800 }); g.restore(); }
    const kc = eOut((T - r.final - 1.4) / 0.5); if (kc > 0) { g.save(); g.globalAlpha = kc; g.translate(W / 2, 1385); g.font = '800 46px M, "Noto Color Emoji"'; const s = 'Folge für mehr Biss-Duelle 👉'; const tw = g.measureText(s).width;
      rrect(-tw / 2 - 30, -40, tw + 60, 80, 20); g.fillStyle = '#000'; g.fill(); text(s, 0, 2, 46, '#fff', { w: 800 }); g.restore(); } }
  return st.ri;
}
(async () => {
  TL = await (await fetch('build/timeline.json')).json(); R = TL.rounds;
  await document.fonts.load('900 50px M'); await document.fonts.load('800 50px M'); await document.fonts.load('700 50px M'); await document.fonts.load('50px "Noto Color Emoji"');
  window.renderAt = renderAt; renderAt(0.5); window.READY = true;
})();
