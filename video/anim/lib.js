// Zeichen-Bibliothek: Farben, Helfer, Charakter-Rig ("Du"), Hund, Autos.
const INK = '#17142b';
const C = {
  skin: '#f3c29b', skinSh: '#d99a74', hair: '#5b3a29', hairHi: '#83573c',
  hood: '#eaa43a', hoodSh: '#bf7a22', jeans: '#2f4675', jeansSh: '#22345a', shoe: '#f2f2f2',
  pack: '#3f7194', packSh: '#2c5372',
  red: '#ff4848', yellow: '#ffd23f', mug: '#d64b3d',
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const f1 = v => (Math.round(v * 10) / 10);

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); }
function mix(a, b, k) {
  if (!k) return a;
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}

// Gliedmaße mit sauberer Kontur: dicke Ink-Linie + Farblinie darüber
function limb(pts, col, w) {
  const d = 'M' + pts.map(p => `${f1(p[0])},${f1(p[1])}`).join(' L');
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 10}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const glow = (cx, cy, r, col, op = 0.6, f = 'blurL') =>
  `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${col}" opacity="${op}" filter="url(#${f})" stroke="none"/>`;
const txt = (x, y, s, size, fill = '#fff', weight = 800, anchor = 'middle', extra = '') =>
  `<text x="${x}" y="${y}" font-family="Inter" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" stroke="none" ${extra}>${s}</text>`;

// Blinzeln: deterministisch, ca. alle 2.8s
function blinkAt(t, seed = 0) {
  const p = (t + seed * 0.7) % 2.8;
  return p > 2.65 ? 1 : 0;
}

// ------------------------------------------------------------- Kopf
function head(o = {}) {
  const { expr = 'neutral', look = [0, 0], blink = 0, tint = 0, tc = '#1a2550', view = 'front', mouthOpen = 0 } = o;
  const T = c => mix(c, tc, tint);
  const skin = T(C.skin), skinSh = T(C.skinSh), hair = T(C.hair), hairHi = T(C.hairHi);
  let g = '';
  if (view === 'back') {
    g += `<ellipse cx="-64" cy="8" rx="13" ry="18" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
    g += `<ellipse cx="64" cy="8" rx="13" ry="18" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
    g += `<ellipse cx="0" cy="0" rx="66" ry="74" fill="${hair}" stroke="${INK}" stroke-width="5"/>`;
    g += `<path d="M-40,-50 Q-10,-20 -20,30 M20,-60 Q30,-20 15,40 M-55,10 Q-40,40 -30,60" fill="none" stroke="${hairHi}" stroke-width="5" stroke-linecap="round"/>`;
    g += `<path d="M-20,-72 L-12,-96 L2,-73 M10,-74 L26,-94 L30,-70" fill="${hair}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    return g;
  }
  g += `<ellipse cx="-64" cy="10" rx="13" ry="18" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
  g += `<ellipse cx="64" cy="10" rx="13" ry="18" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
  g += `<ellipse cx="0" cy="0" rx="64" ry="72" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
  g += `<path d="M30,-62 Q70,-20 50,45 Q30,68 0,72 Q40,40 42,0 Q42,-40 30,-62Z" fill="${skinSh}" opacity="0.55"/>`;
  // Haare
  g += `<path d="M-68,-6 C-80,-72 -40,-102 0,-100 C52,-102 82,-62 70,-4 C62,-30 52,-40 40,-36 C30,-56 10,-54 -6,-42 C-20,-60 -46,-52 -50,-30 C-58,-36 -66,-24 -68,-6Z" fill="${hair}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  g += `<path d="M-22,-96 L-12,-120 L4,-97 M8,-98 L28,-118 L32,-92" fill="${hair}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  g += `<path d="M-40,-80 Q-20,-90 0,-86" fill="none" stroke="${hairHi}" stroke-width="5" stroke-linecap="round"/>`;
  // Augen
  const wide = expr === 'wide' || expr === 'terror';
  const rx = wide ? 17 : 14, ry = wide ? 21 : 17, pr = expr === 'terror' ? 4 : (wide ? 6 : 8);
  for (const sx of [-1, 1]) {
    const ex = sx * 26, ey = 2;
    if (blink) {
      g += `<path d="M${ex - 14},${ey + 2} Q${ex},${ey + 9} ${ex + 14},${ey + 2}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (expr === 'sleepy') {
      g += `<path d="M${ex - 14},${ey} Q${ex},${ey + 12} ${ex + 14},${ey} Z" fill="#fff" stroke="${INK}" stroke-width="4"/>`;
      g += `<path d="M${ex - 15},${ey} L${ex + 15},${ey}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    } else {
      g += `<ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${INK}" stroke-width="4"/>`;
      g += `<circle cx="${ex + look[0]}" cy="${ey + look[1]}" r="${pr}" fill="${INK}"/>`;
      if (pr > 5) g += `<circle cx="${ex + look[0] + 3}" cy="${ey + look[1] - 3}" r="2.6" fill="#fff"/>`;
    }
    // Brauen
    if (wide || expr === 'scared') g += `<path d="M${ex - sx * 16},${-24} Q${ex},${-36 - (wide ? 4 : 0)} ${ex + sx * 14},${-30}" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round"/>`;
    else g += `<path d="M${ex - 14},${-24} Q${ex},${-28} ${ex + 14},${-24}" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round"/>`;
  }
  g += `<path d="M-3,16 Q6,25 -1,30" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  g += `<ellipse cx="-38" cy="28" rx="12" ry="7" fill="#ff8a7a" opacity="0.35"/><ellipse cx="38" cy="28" rx="12" ry="7" fill="#ff8a7a" opacity="0.35"/>`;
  // Mund
  if (expr === 'terror' || mouthOpen > 0.5) g += `<path d="M-15,44 Q0,36 15,44 Q14,64 0,64 Q-14,64 -15,44Z" fill="#5a1f2a" stroke="${INK}" stroke-width="4"/>`;
  else if (wide || expr === 'scared') g += `<ellipse cx="0" cy="48" rx="8" ry="10" fill="#5a1f2a" stroke="${INK}" stroke-width="4"/>`;
  else if (expr === 'sleepy') g += `<path d="M-10,46 Q0,50 10,46" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  else g += `<path d="M-14,45 Q0,51 14,45" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  return g;
}

// ------------------------------------------------------------- Ganzer Körper
// Ursprung = Hüftmitte. Kopf bei y=-265, Füße bei y=+230.
function person(o = {}) {
  const { x = 0, y = 0, s = 1, view = 'front', arms = {}, legs = 'stand', phase = 0, tint = 0, tc = '#1a2550',
    breath = 0, backpack = false, headTilt = 0, rot = 0 } = o;
  const T = c => mix(c, tc, tint);
  const hood = T(C.hood), hoodSh = T(C.hoodSh), jeans = T(C.jeans), skin = T(C.skin), shoe = T(C.shoe);
  const al = arms.l || [12, 8], ar = arms.r || [12, 8];
  const by = Math.sin(breath * 2 * Math.PI / 3.2) * 3;
  let g = `<g transform="translate(${f1(x)},${f1(y)}) rotate(${rot}) scale(${s})">`;
  // Schatten am Boden
  if (legs !== 'none') g += `<ellipse cx="0" cy="238" rx="110" ry="18" fill="#000" opacity="0.25" stroke="none"/>`;
  // Beine
  const leg = (side, sw) => {
    const hx = side * 32;
    if (legs === 'walk') {
      const a = Math.sin(phase + (side > 0 ? Math.PI : 0)) * 26 * Math.PI / 180;
      const kb = Math.max(0, Math.sin(phase + (side > 0 ? Math.PI : 0) + 1.2)) * 20;
      const kx = hx + Math.sin(a) * 115, ky = 20 + Math.cos(a) * 115;
      const fx = kx + Math.sin(a - kb * Math.PI / 180) * 105, fy = ky + Math.cos(a - kb * Math.PI / 180) * 100;
      return limb([[hx, 20], [kx, ky], [fx, fy]], jeans, 44) + `<ellipse cx="${f1(fx + 8)}" cy="${f1(fy + 8)}" rx="30" ry="15" fill="${shoe}" stroke="${INK}" stroke-width="5"/>`;
    }
    return limb([[hx, 20], [hx + side * 4, 125], [hx + side * 6, 222]], jeans, 44) +
      `<ellipse cx="${hx + side * 12}" cy="232" rx="32" ry="15" fill="${shoe}" stroke="${INK}" stroke-width="5"/>`;
  };
  if (legs === 'stand' || legs === 'walk') g += leg(-1) + leg(1);
  // Torso
  g += `<g transform="translate(0,${f1(by)})">`;
  const torso = 'M-72,-178 C-94,-100 -90,-20 -82,40 L82,40 C90,-20 94,-100 72,-178 Q0,-202 -72,-178Z';
  const armF = (side, a) => {
    const sx = side * 70, sy = -160;
    const a1 = a[0] * Math.PI / 180, a2 = (a[0] + a[1]) * Math.PI / 180;
    const ex = sx + side * Math.sin(a1) * 100, ey = sy + Math.cos(a1) * 100;
    const hx = ex + side * Math.sin(a2) * 95, hy = ey + Math.cos(a2) * 95;
    return limb([[sx, sy], [ex, ey], [hx, hy]], hood, 40) + `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="20" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
  };
  const front = a => a[2] === 'front';
  if (!front(al)) g += armF(-1, al);
  if (!front(ar)) g += armF(1, ar);
  g += `<path d="${torso}" fill="${hood}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  g += `<path d="M30,-185 C72,-160 88,-60 82,40 L42,40 C56,-40 52,-140 30,-185Z" fill="${hoodSh}" opacity="0.6"/>`;
  g += `<path d="M-82,30 L82,30" stroke="${hoodSh}" stroke-width="10"/>`;
  if (view === 'front') {
    g += `<path d="M-46,-22 L46,-22 L56,28 L-56,28Z" fill="${hoodSh}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    g += `<path d="M-62,-186 Q0,-150 62,-186 Q40,-210 0,-210 Q-40,-210 -62,-186Z" fill="${hoodSh}" stroke="${INK}" stroke-width="5"/>`;
    g += `<path d="M-18,-168 L-20,-112 M18,-168 L20,-112" stroke="#f4f0e6" stroke-width="5" stroke-linecap="round"/>`;
    if (backpack) g += `<path d="M-62,-170 L-56,-40 M62,-170 L56,-40" stroke="${T(C.pack)}" stroke-width="16" stroke-linecap="round"/>`;
  } else {
    g += `<path d="M-64,-186 Q-70,-110 0,-96 Q70,-110 64,-186 Q0,-160 -64,-186Z" fill="${hoodSh}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    if (backpack) {
      g += `<rect x="-62" y="-160" width="124" height="160" rx="30" fill="${T(C.pack)}" stroke="${INK}" stroke-width="5"/>`;
      g += `<rect x="-42" y="-80" width="84" height="60" rx="14" fill="${T(C.packSh)}" stroke="${INK}" stroke-width="4"/>`;
    }
  }
  // Hals + Kopf
  g += `<g transform="translate(0,-262) rotate(${headTilt})">${head({ ...o, tint, tc })}</g>`;
  if (front(al)) g += armF(-1, al);
  if (front(ar)) g += armF(1, ar);
  g += '</g></g>';
  return g;
}

// Sitzend, Knie angezogen, Arme um die Knie (Frontansicht)
function personSitting(o = {}) {
  const { x = 0, y = 0, s = 1, tint = 0, tc = '#1a2550', tremble = 0 } = o;
  const T = c => mix(c, tc, tint);
  const hood = T(C.hood), hoodSh = T(C.hoodSh), jeans = T(C.jeans), jeansSh = T(C.jeansSh), skin = T(C.skin), shoe = T(C.shoe);
  let g = `<g transform="translate(${f1(x + tremble)},${f1(y)}) scale(${s})">`;
  g += `<ellipse cx="0" cy="150" rx="210" ry="26" fill="#000" opacity="0.3"/>`;
  g += `<path d="M-80,-170 C-100,-80 -100,40 -95,130 L95,130 C100,40 100,-80 80,-170 Q0,-196 -80,-170Z" fill="${hood}" stroke="${INK}" stroke-width="5"/>`;
  g += `<path d="M-62,-178 Q0,-144 62,-178 Q40,-204 0,-204 Q-40,-204 -62,-178Z" fill="${hoodSh}" stroke="${INK}" stroke-width="5"/>`;
  g += `<g transform="translate(0,-252)">${head({ ...o, tint, tc })}</g>`;
  // Knie
  for (const sd of [-1, 1]) {
    g += `<path d="M${sd * 20},130 L${sd * 52},-30 Q${sd * 60},-70 ${sd * 98},-40 L${sd * 120},140 Z" fill="${jeans}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    g += `<path d="M${sd * 70},-50 L${sd * 110},140 L${sd * 120},140 L${sd * 98},-40Z" fill="${jeansSh}" opacity="0.7"/>`;
    g += `<ellipse cx="${sd * 95}" cy="150" rx="44" ry="20" fill="${shoe}" stroke="${INK}" stroke-width="5"/>`;
  }
  // Arme um die Knie
  g += limb([[-86, -150], [-120, -40], [-20, 10]], hood, 40) + limb([[86, -150], [120, -40], [20, 10]], hood, 40);
  g += `<circle cx="-14" cy="10" r="21" fill="${skin}" stroke="${INK}" stroke-width="5"/><circle cx="14" cy="14" r="21" fill="${skin}" stroke="${INK}" stroke-width="5"/>`;
  return g + '</g>';
}

// POV-Hände mit Hoodie-Ärmeln, die ein Handy halten
function povHands(cx, cy, w, h, tint = 0, tc = '#141a33') {
  const T = c => mix(c, tc, tint);
  const hood = T(C.hood), hoodSh = T(C.hoodSh), skin = T(C.skin);
  let g = '';
  for (const sd of [-1, 1]) {
    const hx = cx + sd * (w / 2 + 10), hy = cy + h * 0.28;
    g += `<path d="M${hx + sd * 70},${hy + 40} L${cx + sd * (w / 2 + 330)},${2000} L${cx + sd * (w / 2 - 90)},${2000} L${hx - sd * 70},${hy + 90}Z" fill="${hood}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    g += `<path d="M${hx + sd * 40},${hy + 110} L${cx + sd * (w / 2 + 250)},${2000} L${cx + sd * (w / 2 + 120)},${2000}Z" fill="${hoodSh}" opacity="0.6"/>`;
    g += `<path d="M${hx - sd * 62},${hy + 150} L${hx + sd * 72},${hy + 104}" stroke="${hoodSh}" stroke-width="22" stroke-linecap="round"/>`;
    g += `<path d="M${hx - sd * 60},${hy + 90} Q${hx - sd * 70},${hy + 20} ${hx + sd * 6},${hy - 10} Q${hx + sd * 60},${hy + 20} ${hx + sd * 52},${hy + 90} Z" fill="${skin}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    g += `<path d="M${hx - sd * 52},${hy + 92} Q${hx},${hy + 115} ${hx + sd * 52},${hy + 92}" fill="${hoodSh}" stroke="${INK}" stroke-width="6"/>`;
  }
  return g;
}
function povThumbs(cx, cy, w, h, tap = 0, tint = 0, tc = '#141a33') {
  const skin = mix(C.skin, tc, tint);
  let g = '';
  for (const sd of [-1, 1]) {
    const hx = cx + sd * (w / 2 - 6), hy = cy + h * 0.2 - (sd > 0 ? tap * 30 : 0);
    g += `<path d="M${hx + sd * 14},${hy + 60} Q${hx - sd * 10},${hy - 10} ${hx - sd * 50},${hy - 40} Q${hx - sd * 74},${hy - 40} ${hx - sd * 62},${hy - 10} Q${hx - sd * 40},${hy + 30} ${hx - sd * 20},${hy + 80}Z" fill="${skin}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  return g;
}

// ------------------------------------------------------------- Handy
function phone(cx, cy, w, h, rot, screen, glowCol = '#9fd0ff', glowOp = 0.5) {
  let g = `<g transform="translate(${f1(cx)},${f1(cy)}) rotate(${f1(rot)})">`;
  if (glowOp > 0) g += `<rect x="${-w * 0.65}" y="${-h * 0.6}" width="${w * 1.3}" height="${h * 1.2}" rx="80" fill="${glowCol}" opacity="${glowOp}" filter="url(#blurL)"/>`;
  g += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${w * 0.13}" fill="#22223a" stroke="${INK}" stroke-width="6"/>`;
  g += `<rect x="${-w / 2 + w * 0.05}" y="${-h / 2 + w * 0.05}" width="${w * 0.9}" height="${h - w * 0.1}" rx="${w * 0.09}" fill="url(#screen)"/>`;
  g += `<rect x="-${w * 0.14}" y="${-h / 2 + w * 0.08}" width="${w * 0.28}" height="${w * 0.07}" rx="${w * 0.035}" fill="#111"/>`;
  g += screen + '</g>';
  return g;
}

// ------------------------------------------------------------- Hund
function dog(x, y, s, phase, growl = 0, eyeGlow = 1, flip = false, fur = '#5a4639') {
  const furSh = mix(fur, '#000', 0.35);
  const sc = flip ? -s : s;
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(sc * 100) / 100},${s})">`;
  g += `<ellipse cx="0" cy="175" rx="170" ry="16" fill="#000" opacity="0.35"/>`;
  const legP = (lx, off, col) => {
    const a = Math.sin(phase + off) * 0.45;
    const kx = lx + Math.sin(a) * 70, ky = 40 + Math.cos(a) * 70;
    return limb([[lx, 20], [kx, ky], [kx - 6, 165]], col, 26);
  };
  g += legP(-95, Math.PI, furSh) + legP(105, 0, furSh);
  g += `<path d="M140,-10 Q210,-60 225,-120" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="M140,-10 Q210,-60 225,-120" fill="none" stroke="${fur}" stroke-width="20" stroke-linecap="round"/>`;
  g += `<path d="M-150,-30 Q-140,-80 -40,-70 Q80,-90 150,-40 Q175,10 140,50 Q20,70 -120,50 Q-165,20 -150,-30Z" fill="${fur}" stroke="${INK}" stroke-width="6"/>`;
  g += `<path d="M-120,40 Q20,60 140,40 Q120,60 20,66 Q-80,66 -120,40Z" fill="${furSh}"/>`;
  g += `<path d="M-60,-74 l10,-26 l12,22 l12,-26 l12,24 l12,-24 l10,26" fill="${furSh}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  g += legP(-70, 0, fur) + legP(125, Math.PI, fur);
  // Kopf
  g += `<g transform="translate(-170,-70) rotate(${f1(Math.sin(phase * 0.5) * 4)})">`;
  g += `<path d="M30,10 Q20,-60 -30,-60 Q-80,-60 -100,-20 L-150,-6 Q-162,14 -148,30 Q-100,46 -50,40 Q10,50 30,10Z" fill="${fur}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  g += `<path d="M-10,-50 L-4,-110 L24,-46Z M-40,-56 L-46,-112 L-12,-58Z" fill="${furSh}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  g += `<ellipse cx="-150" cy="2" rx="12" ry="9" fill="${INK}"/>`;
  if (growl > 0) {
    g += `<path d="M-146,24 Q-110,${30 + growl * 14} -70,26 L-70,34 Q-110,${44 + growl * 14} -146,32Z" fill="#3a0f14" stroke="${INK}" stroke-width="4"/>`;
    g += `<path d="M-136,26 l6,10 l6,-10 l6,10 l6,-10 l6,10 l6,-10 l6,10 l6,-10" fill="#fff" stroke="none"/>`;
  }
  g += glow(-58, -22, 26 * eyeGlow, C.red, 0.9 * eyeGlow, 'blurS');
  g += `<ellipse cx="-58" cy="-22" rx="12" ry="8" fill="${eyeGlow > 0.3 ? '#ff5050' : '#ddd'}" stroke="${INK}" stroke-width="3"/>`;
  g += `<path d="M-74,-34 L-40,-28" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  g += '</g></g>';
  return g;
}

// ------------------------------------------------------------- Auto (Heckansicht)
function carRear(x, y, s, col, o = {}) {
  const { lights = 0, door = 0, rust = 0, vines = 0 } = o;
  const body = mix(col, '#7a5b3a', rust), dark = mix(body, '#000', 0.3);
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})">`;
  g += `<ellipse cx="0" cy="28" rx="200" ry="20" fill="#000" opacity="0.3"/>`;
  if (lights > 0) g += glow(-120, -60, 70, C.red, 0.7 * lights, 'blurM') + glow(120, -60, 70, C.red, 0.7 * lights, 'blurM');
  g += `<path d="M-150,-110 Q-140,-200 -100,-212 L100,-212 Q140,-200 150,-110 L168,-20 L-168,-20 Z" fill="${body}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  g += `<path d="M-112,-118 Q-102,-190 -80,-196 L80,-196 Q102,-190 112,-118Z" fill="#33405e" stroke="${INK}" stroke-width="5"/>`;
  g += `<path d="M-70,-190 L-20,-190 L-60,-124 L-100,-124Z" fill="#fff" opacity="0.25"/>`;
  g += `<rect x="-174" y="-112" width="348" height="98" rx="18" fill="${body}" stroke="${INK}" stroke-width="6"/>`;
  g += `<rect x="-174" y="-50" width="348" height="36" rx="12" fill="${dark}"/>`;
  g += `<rect x="-154" y="-92" width="72" height="30" rx="9" fill="${lights > 0 ? '#ff6a5a' : '#a33'}" stroke="${INK}" stroke-width="5"/>`;
  g += `<rect x="82" y="-92" width="72" height="30" rx="9" fill="${lights > 0 ? '#ff6a5a' : '#a33'}" stroke="${INK}" stroke-width="5"/>`;
  g += `<rect x="-46" y="-82" width="92" height="34" rx="5" fill="#f4f4f4" stroke="${INK}" stroke-width="4"/>`;
  g += txt(0, -56, 'B·DU 366', 20, INK, 800);
  g += `<rect x="-164" y="-20" width="62" height="46" rx="12" fill="${INK}"/><rect x="102" y="-20" width="62" height="46" rx="12" fill="${INK}"/>`;
  if (door > 0) {
    g += `<path d="M168,-130 L${168 + 110 * door},-170 L${168 + 110 * door},-10 L168,-20Z" fill="${body}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    g += `<path d="M176,-120 L${168 + 95 * door},-152 L${168 + 95 * door},-110 L176,-90Z" fill="#33405e" stroke="${INK}" stroke-width="4"/>`;
  }
  if (rust > 0) g += `<path d="M-150,-40 q20,-20 40,0 q20,20 50,0 M60,-100 q20,10 40,-10" fill="none" stroke="#6b3d1e" stroke-width="10" opacity="${rust}"/>`;
  if (vines > 0) {
    g += `<path d="M-170,0 Q-140,-80 -90,-110 Q-40,-150 0,-200 M170,0 Q150,-60 120,-112" fill="none" stroke="#2f6b35" stroke-width="10" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f1((1 - vines) * 100) / 100}"/>`;
    for (let i = 0; i < 6; i++) if (vines > i / 6) g += `<ellipse cx="${-160 + i * 30}" cy="${-20 - i * 32}" rx="20" ry="11" fill="#4f9a4a" stroke="${INK}" stroke-width="3" transform="rotate(${i % 2 ? 30 : -30} ${-160 + i * 30} ${-20 - i * 32})"/>`;
  }
  return g + '</g>';
}

// Fenster auf perspektivischer Fassade
function facadeWindows(xa, xb, ta, ba, tb, bb, cols, rows, fill, frame, lit = null) {
  let g = '';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const P = (u, v) => { const x = lerp(xa, xb, u), t = lerp(ta, tb, u), b = lerp(ba, bb, u); return `${f1(x)},${f1(lerp(t, b, v))}`; };
    const u0 = (i + 0.2) / cols, u1 = (i + 0.8) / cols, v0 = (j + 0.2) / rows, v1 = (j + 0.75) / rows;
    const f = lit && lit(i, j) ? '#ffd27a' : fill;
    g += `<polygon points="${P(u0, v0)} ${P(u1, v0)} ${P(u1, v1)} ${P(u0, v1)}" fill="${f}" stroke="${frame}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  return g;
}

module.exports = { INK, C, clamp, lerp, ease, easeOut, f1, rng, mix, limb, glow, txt, blinkAt, head, person, personSitting, povHands, povThumbs, phone, dog, carRear, facadeWindows };
