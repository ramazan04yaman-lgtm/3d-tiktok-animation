/**
 * DIORAMA – detaillierte 3D-Umgebung für Nahaufnahmen der Einwohner (Hof von Mensch Nr. 1, Dorf).
 * Gleicher Stil wie die Figuren: glatte Materialien, kräftige schwarze Konturen, klare Farben.
 * Einheit: 1 = eine Figurenhöhe-Einheit (wird beim Platzieren auf die Erde skaliert).
 * Mit Himmelskuppel + Nebel am Horizont: Beim Heranfliegen entsteht eine echte kleine Welt.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { outlineMaterial, smooth } from './characters.ts';

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const grasTex = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#79c94f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * 512, y = rnd() * 512, l = 4 + rnd() * 7;
    g.strokeStyle = `hsl(${95 + rnd() * 20}, ${55 + rnd() * 20}%, ${38 + rnd() * 22}%)`;
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - l); g.stroke();
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = ['#fff', '#ffd23a', '#ff8fb0'][i % 3]; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 2.5, 0, 7); g.fill(); }
}, 14);
const wegTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = '#d8c39a'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -16 : 0; x < 256; x += 32) {
    g.fillStyle = `hsl(35, ${25 + rnd() * 15}%, ${66 + rnd() * 10}%)`;
    g.beginPath(); g.roundRect(x + 2, y + 2, 28, 28, 7); g.fill();
    g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 2; g.stroke();
  }
}, 2);
const dachTex = (farbe: string) => canvasTex(128, 128, (g) => {
  g.fillStyle = farbe; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 128; x += 16) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + 8, y + 14, 8, 0, Math.PI); g.fill();
  }
}, 2);

/** Teil mit glattem Material + schwarzer Kontur (wie die Figuren). */
function teil(geo: THREE.BufferGeometry, mat: THREE.Material | string, kontur = 0.03): THREE.Mesh {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? smooth(mat, { roughness: 0.55 }) : mat);
  m.castShadow = true; m.receiveShadow = true;
  if (kontur > 0) m.add(new THREE.Mesh(geo, outlineMaterial(kontur)));
  return m;
}

function haus(wand: string, dach: string, h = 2.2): THREE.Group {
  const g = new THREE.Group();
  const w = 3.2, d = 2.8;
  const wall = teil(new THREE.BoxGeometry(w, h, d), wand); wall.position.y = h / 2;
  const roofGeo = new THREE.CylinderGeometry(0.01, w * 0.86, 1.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, d / w + 0.08);
  const roof = teil(roofGeo, smooth('#ffffff', { map: dachTex(dach), roughness: 0.6 }));
  roof.position.y = h + 0.78;
  const chim = teil(new THREE.BoxGeometry(0.4, 0.9, 0.4), '#b05a42'); chim.position.set(w * 0.25, h + 1.1, -0.3);
  const door = teil(new THREE.BoxGeometry(0.7, 1.25, 0.08), '#8a5a33', 0.02); door.position.set(-0.6, 0.62, d / 2 + 0.03);
  const knob = teil(new THREE.SphereGeometry(0.05, 8, 6), '#ffd23a', 0); knob.position.set(-0.36, 0.62, d / 2 + 0.09);
  g.add(wall, roof, chim, door, knob);
  // Fenster mit Rahmen, Glas und Blumenkasten
  for (const x of [0.75]) {
    const frame = teil(new THREE.BoxGeometry(0.85, 0.75, 0.08), '#ffffff', 0.02); frame.position.set(x, 1.3, d / 2 + 0.03);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.56), smooth('#9fdcff', { roughness: 0.05, metalness: 0.1, emissive: '#3a78a8', emissiveIntensity: 0.25 }));
    glass.position.set(x, 1.3, d / 2 + 0.075);
    const cross = teil(new THREE.BoxGeometry(0.05, 0.56, 0.02), '#ffffff', 0); cross.position.set(x, 1.3, d / 2 + 0.08);
    const box = teil(new THREE.BoxGeometry(0.9, 0.18, 0.22), '#a8683d', 0.02); box.position.set(x, 0.86, d / 2 + 0.12);
    g.add(frame, glass, cross, box);
    for (let k = 0; k < 4; k++) {
      const f = teil(new THREE.SphereGeometry(0.09, 10, 8), ['#ff4f6d', '#ffd23a', '#ff8fd0', '#ff7a2f'][k], 0.012);
      f.position.set(x - 0.3 + k * 0.2, 1.0, d / 2 + 0.14); g.add(f);
    }
  }
  // Seitenfenster
  const sw = teil(new THREE.BoxGeometry(0.08, 0.6, 0.7), '#ffffff', 0.02); sw.position.set(w / 2 + 0.03, 1.3, 0);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.45).rotateY(Math.PI / 2), smooth('#9fdcff', { roughness: 0.05, emissive: '#3a78a8', emissiveIntensity: 0.25 }));
  sg.position.set(w / 2 + 0.075, 1.3, 0);
  g.add(sw, sg);
  return g;
}

function baum(h = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = teil(new THREE.CylinderGeometry(0.14 * h, 0.2 * h, 1.3 * h, 10), '#8a5a33'); trunk.position.y = 0.65 * h;
  g.add(trunk);
  const greens = ['#3faa3a', '#4fbf45', '#36993a'];
  [[0, 1.75, 0, 0.85], [-0.45, 1.45, 0.15, 0.6], [0.45, 1.5, -0.1, 0.62], [0.05, 2.25, 0, 0.55]].forEach(([x, y, z, r], k) => {
    const c = teil(new THREE.SphereGeometry(r * h, 20, 14), greens[k % 3], 0.03); c.position.set(x * h, y * h, z * h); g.add(c);
  });
  return g;
}

function zaun(len: number): THREE.Group {
  const g = new THREE.Group();
  const n = Math.round(len / 0.5);
  for (let i = 0; i <= n; i++) { const p = teil(new THREE.BoxGeometry(0.12, 0.7, 0.08), '#fff7e8', 0.015); p.position.set(i * 0.5 - len / 2, 0.35, 0); g.add(p); }
  for (const y of [0.25, 0.5]) { const r = teil(new THREE.BoxGeometry(len, 0.08, 0.06), '#fff7e8', 0.015); r.position.set(0, y, -0.02); g.add(r); }
  return g;
}

function laterne(): THREE.Group {
  const g = new THREE.Group();
  const pole = teil(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 10), '#2a2f45'); pole.position.y = 1.1;
  const lamp = teil(new THREE.SphereGeometry(0.18, 14, 10), smooth('#fff3c4', { emissive: '#ffd27a', emissiveIntensity: 0.9 }), 0.02); lamp.position.y = 2.3;
  g.add(pole, lamp); return g;
}

function bank(): THREE.Group {
  const g = new THREE.Group();
  const seat = teil(new THREE.BoxGeometry(1.4, 0.08, 0.4), '#c07a43', 0.015); seat.position.y = 0.42;
  const back = teil(new THREE.BoxGeometry(1.4, 0.35, 0.06), '#c07a43', 0.015); back.position.set(0, 0.68, -0.18);
  g.add(seat, back);
  for (const x of [-0.6, 0.6]) { const l = teil(new THREE.BoxGeometry(0.08, 0.42, 0.36), '#2a2f45', 0.012); l.position.set(x, 0.21, 0); g.add(l); }
  return g;
}

// ------------------------------------------------------------------ AMERIKA (Kleinstadt im Mittleren Westen)
const strasseTex = () => canvasTex(512, 64, (g) => {
  g.fillStyle = '#4a4e57'; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.06})`; g.fillRect(rnd() * 512, rnd() * 64, 2, 2); }
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 3, 512, 3); g.fillRect(0, 58, 512, 3);          // weiße Randlinien
  g.fillStyle = '#ffcc1f'; for (let x = 0; x < 512; x += 64) g.fillRect(x + 8, 29, 40, 6);  // gelbe Mittellinie (gestrichelt)
});
const flaggeTex = () => canvasTex(380, 200, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8202f'; g.fillRect(0, (i * 200) / 13, 380, 200 / 13 + 1); }
  g.fillStyle = '#25356f'; g.fillRect(0, 0, 152, (200 * 7) / 13);
  g.fillStyle = '#ffffff';
  for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) {
    const x = 13 + c * 25 + (r % 2 ? 12.5 : 0), y = 10 + r * 11.5;
    g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 2.2 : 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
  }
});
const schildTex = (zeilen: string[], bg: string, fg: string) => canvasTex(512, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  zeilen.forEach((z, i) => { g.font = `900 ${i === 1 ? 74 : 40}px Arial, sans-serif`; g.fillText(z, 256, 60 + i * 72); });
});

/** Amerikanisches Holzhaus mit Veranda (Säulen + Vordach). */
function usHaus(wand: string, dach: string): THREE.Group {
  const g = haus(wand, dach, 2.4);
  const vordach = teil(new THREE.BoxGeometry(3.4, 0.12, 1.2), '#ffffff', 0.02); vordach.position.set(0, 1.75, 1.95); g.add(vordach);
  for (const x of [-1.5, 1.5]) { const s = teil(new THREE.CylinderGeometry(0.07, 0.07, 1.7, 10), '#ffffff', 0.015); s.position.set(x, 0.85, 2.45); g.add(s); }
  const stufe = teil(new THREE.BoxGeometry(3.4, 0.2, 1.3), '#c9b79a', 0.015); stufe.position.set(0, 0.1, 1.95); g.add(stufe);
  return g;
}
function briefkasten(farbe: string): THREE.Group {
  const g = new THREE.Group();
  const pfosten = teil(new THREE.BoxGeometry(0.1, 1.0, 0.1), '#8a5a33', 0.012); pfosten.position.y = 0.5;
  const kasten = teil(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), farbe, 0.015);
  kasten.position.y = 1.05;
  const boden = teil(new THREE.BoxGeometry(0.4, 0.06, 0.6), farbe, 0.012); boden.position.y = 1.05;
  const fahne = teil(new THREE.BoxGeometry(0.03, 0.28, 0.14), '#e0262f', 0.008); fahne.position.set(0.22, 1.2, 0.1);
  g.add(pfosten, kasten, boden, fahne); return g;
}
function wasserturm(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
    const bein = teil(new THREE.CylinderGeometry(0.12, 0.16, 8, 10), '#c74a3a', 0.02); bein.position.set(x, 4, z); bein.rotation.set(-z * 0.04, 0, x * 0.04); g.add(bein);
  }
  const tank = teil(new THREE.CylinderGeometry(2.4, 2.4, 2.6, 32), smooth('#ffffff', { map: schildTex(['', 'WATER', ''], '#7cc6ff', '#ffffff') }), 0.04);
  tank.position.y = 9.2; tank.rotation.y = Math.PI / 2;
  const boden = teil(new THREE.SphereGeometry(2.4, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#7cc6ff', 0.03); boden.position.y = 7.9;
  const dach = teil(new THREE.ConeGeometry(2.6, 1.4, 32), '#c74a3a', 0.03); dach.position.y = 11.2;
  g.add(tank, boden, dach); return g;
}
function scheune(): THREE.Group {
  const g = new THREE.Group();
  const wand = teil(new THREE.BoxGeometry(5, 3.6, 6), '#b8322a'); wand.position.y = 1.8;
  const dach = teil(new THREE.CylinderGeometry(0.05, 3.4, 2.2, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 1.25), '#3d3a3a'); dach.position.y = 4.7;
  const tor = teil(new THREE.BoxGeometry(2, 2.4, 0.08), '#ffffff', 0.02); tor.position.set(0, 1.2, 3.02);
  const tor2 = teil(new THREE.BoxGeometry(1.8, 2.2, 0.06), '#b8322a', 0.015); tor2.position.set(0, 1.2, 3.06);
  const x1 = teil(new THREE.BoxGeometry(2.8, 0.14, 0.04).rotateZ(0.83), '#ffffff', 0); x1.position.set(0, 1.2, 3.1);
  const x2 = teil(new THREE.BoxGeometry(2.8, 0.14, 0.04).rotateZ(-0.83), '#ffffff', 0); x2.position.set(0, 1.2, 3.1);
  g.add(wand, dach, tor, tor2, x1, x2); return g;
}
function schulbus(): THREE.Group {
  const g = new THREE.Group();
  const fenster = canvasTex(512, 128, (c) => {
    c.fillStyle = '#ffc21a'; c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#1b2333'; for (let x = 24; x < 480; x += 58) c.fillRect(x, 18, 46, 40);
    c.fillRect(0, 76, 512, 8); c.font = '900 26px Arial'; c.fillText('SCHOOL BUS', 170, 112);
  });
  const koerper = teil(new THREE.BoxGeometry(6, 1.7, 1.8), smooth('#ffffff', { map: fenster }), 0.03); koerper.position.y = 1.25;
  const haube = teil(new THREE.BoxGeometry(1.0, 1.0, 1.7), '#ffc21a', 0.03); haube.position.set(3.45, 0.9, 0);
  for (const [x, z] of [[-2, 0.9], [2.2, 0.9], [-2, -0.9], [2.2, -0.9]]) {
    const rad = teil(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18).rotateX(Math.PI / 2), '#1b1d24', 0.02); rad.position.set(x, 0.42, z); g.add(rad);
  }
  g.add(koerper, haube); return g;
}
function hydrant(): THREE.Group {
  const g = new THREE.Group();
  const k = teil(new THREE.CylinderGeometry(0.2, 0.24, 0.7, 14), '#e0262f', 0.015); k.position.y = 0.35;
  const kopf = teil(new THREE.SphereGeometry(0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#e0262f', 0.015); kopf.position.y = 0.7;
  const seite = teil(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10).rotateZ(Math.PI / 2), '#e0262f', 0.012); seite.position.y = 0.5;
  g.add(k, kopf, seite); return g;
}

/** Riesiger Glas-Eimer (Maße wie EIMER in people.ts): durchsichtig, mit Rand, Henkel, Strichen je 20 Tropfen und Schild. */
function glasEimer(r: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const glas = new THREE.MeshStandardMaterial({ color: '#d8f3ff', transparent: true, opacity: 0.11, roughness: 0.05, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false });
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r, h, 64, 1, true), glas); wand.position.y = h / 2; wand.renderOrder = 2;
  const boden = teil(new THREE.CylinderGeometry(r, r, 0.15, 48), smooth('#bfe9ff', { transparent: true, opacity: 0.55 }), 0.02); boden.position.y = 0.075;
  const randOben = teil(new THREE.TorusGeometry(r * 1.06, 0.09, 12, 64).rotateX(Math.PI / 2), '#e9f9ff', 0.02); randOben.position.y = h;
  const randUnten = teil(new THREE.TorusGeometry(r, 0.07, 10, 64).rotateX(Math.PI / 2), '#e9f9ff', 0.015); randUnten.position.y = 0.05;
  g.add(wand, boden, randOben, randUnten);
  // Striche bei 20, 40, 60, 80 Tropfen
  for (let k = 1; k <= 4; k++) {
    const y = 0.15 + k * (h - 0.15) / 5;
    const strich = new THREE.Mesh(new THREE.TorusGeometry(r * (1 + 0.06 * y / h) + 0.01, 0.025, 6, 64, Math.PI * 0.5).rotateX(Math.PI / 2).rotateY(Math.PI * 0.25), smooth('#ffffff'));
    strich.position.y = y; g.add(strich);
  }
  // Henkel (Bügel)
  // Henkel (Bügel) links-rechts, nach hinten umgeklappt -> verdeckt den Blick in den Eimer nicht
  const henkel = teil(new THREE.TorusGeometry(r * 1.08, 0.07, 10, 48, Math.PI), '#c9ced8', 0.02);
  henkel.position.y = h - 0.1; henkel.rotation.x = -1.35; g.add(henkel);
  // Schild am oberen Rand
  const tafel = teil(new THREE.BoxGeometry(2.6, 0.75, 0.06), smooth('#ffffff', { map: schildTex(['AMERIKA · USA', '100 = VOLL', ''], '#1f4f9f', '#ffffff') }), 0.02);
  tafel.position.set(0, h + 0.6, -(r * 1.06 + 0.05)); g.add(tafel);   // am hinteren Rand: durchs Glas lesbar, verdeckt nichts
  return g;
}

export interface Diorama { group: THREE.Group; update(t: number, camDist: number): void; radius: number }

/** Baut die Umgebung. "hof" = Haus von Mensch Nr. 1, "dorf" = Dorfplatz mit Brunnen. */
export function createDiorama(art: 'hof' | 'dorf' | 'amerika'): Diorama {
  seed = art === 'hof' ? 11 : art === 'amerika' ? 31 : 23;
  const g = new THREE.Group();
  const R = 60;
  // Boden: Wiese mit Struktur, Rand verschwindet im Dunst (Nebel)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 96).rotateX(-Math.PI / 2), smooth('#ffffff', { map: grasTex(), roughness: 0.95 }));
  ground.receiveShadow = true;
  g.add(ground);
  // Himmelskuppel mit Verlauf
  const sky = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uOpacity; varying vec3 vP;
      void main(){ float h = clamp(vP.y, 0.0, 1.0);
        vec3 top = pow(vec3(0.33,0.62,1.0), vec3(2.2)), hor = pow(vec3(0.86,0.94,1.0), vec3(2.2));
        vec3 c = mix(hor, top, smoothstep(0.0, 0.55, h));
        gl_FragColor = vec4(c, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1;
  g.add(sky);
  // Wolken am Himmel
  for (let i = 0; i < 9; i++) {
    const wolke = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(2 + rnd() * 1.5, 16, 12), smooth('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35 }));
      p.position.set(k * 2.4 - 3.6, rnd() * 0.8, rnd() * 1.2); p.scale.y = 0.6; wolke.add(p);
    }
    const a = (i / 9) * Math.PI * 2;
    wolke.position.set(Math.cos(a) * 42, 16 + rnd() * 8, Math.sin(a) * 42);
    g.add(wolke);
  }
  const deko = new THREE.Group();
  g.add(deko);
  const wegMat = smooth('#ffffff', { map: wegTex(), roughness: 0.9 });
  let wasser: THREE.Mesh | null = null;
  let flagge: THREE.Mesh | null = null;
  if (art === 'amerika') {
    // Straße (Ost-West) hinter der Gemeinschaft, Gehweg, Häuser mit Veranda auf der Nordseite
    const strasse = new THREE.Mesh(new THREE.PlaneGeometry(90, 3.2).rotateX(-Math.PI / 2), smooth('#ffffff', { map: (() => { const t = strasseTex(); t.repeat.set(9, 1); return t; })(), roughness: 0.9 }));
    strasse.position.set(0, 0.012, -3.7); strasse.receiveShadow = true; deko.add(strasse);
    const gehweg = new THREE.Mesh(new THREE.PlaneGeometry(90, 1.1).rotateX(-Math.PI / 2), smooth('#d9d6cf', { roughness: 0.9 }));
    gehweg.position.set(0, 0.014, -5.95); gehweg.receiveShadow = true; deko.add(gehweg);
    const haeuser: [number, string, string][] = [[-13, '#dceeff', '#3c5a8a'], [-4.5, '#fffaf0', '#a8352d'], [4.5, '#fff0c2', '#5a6b7a'], [13, '#e3f6e9', '#2f5f4a']];
    for (const [x, wand, dach] of haeuser) {
      const h = usHaus(wand, dach); h.position.set(x, 0, -10.5); deko.add(h);
      const bk = briefkasten(['#2f5fbf', '#2a2f45', '#e0262f', '#2aa36b'][haeuser.findIndex((q) => q[0] === x)]); bk.position.set(x + 2.2, 0, -6.7); deko.add(bk);
      const z = zaun(5); z.position.set(x - 0.4, 0, -6.9); deko.add(z);
      const b = baum(1.2 + rnd() * 0.3); b.position.set(x + 3.6, 0, -11.5); deko.add(b);
    }
    // US-Flagge am Mast (weht im Wind)
    const mast = teil(new THREE.CylinderGeometry(0.06, 0.09, 6.5, 12), '#d9dde6', 0.015); mast.position.set(-7.2, 3.25, -1.6); deko.add(mast);
    const kugel = teil(new THREE.SphereGeometry(0.14, 12, 10), '#ffd23a', 0.01); kugel.position.set(-7.2, 6.55, -1.6); deko.add(kugel);
    flagge = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.37, 24, 8), smooth('#ffffff', { map: flaggeTex(), side: THREE.DoubleSide }));
    flagge.position.set(-7.2 + 1.3, 5.7, -1.6); flagge.castShadow = true; deko.add(flagge);
    // Wasserturm, rote Scheune, Schulbus, Hydrant, Laternen, Ortsschild
    const wt = wasserturm(); wt.position.set(17, 0, -22); deko.add(wt);
    const sch = scheune(); sch.position.set(-20, 0, -20); sch.rotation.y = 0.5; deko.add(sch);
    const bus = schulbus(); bus.position.set(-15, 0, -3.7); deko.add(bus);
    const hy = hydrant(); hy.position.set(6.4, 0, -1.6); deko.add(hy);
    for (const x of [-10, 9.5]) { const l = laterne(); l.position.set(x, 0, -1.7); deko.add(l); }
    const schild = new THREE.Group();
    const tafel = teil(new THREE.BoxGeometry(3.2, 1.6, 0.1), smooth('#ffffff', { map: schildTex(['WELCOME TO', 'DROPTOWN', 'U.S.A.'], '#1f6b3a', '#ffffff') }), 0.02);
    tafel.position.y = 1.9; schild.add(tafel);
    for (const x of [-1.3, 1.3]) { const p = teil(new THREE.BoxGeometry(0.12, 1.2, 0.12), '#d9dde6', 0.012); p.position.set(x, 0.6, 0); schild.add(p); }
    schild.position.set(7.5, 0, 3); schild.rotation.y = -0.35; deko.add(schild);
    // Der riesige Glas-Eimer (Mitte 1,5 südlich, Radius 2,35, Höhe 5,2 – wie EIMER in people.ts)
    const eimer = glasEimer(2.35, 5.2); eimer.position.set(0, 0, 1.5); deko.add(eimer);
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2, r = 22 + rnd() * 22, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 8 && z > -2) continue;   // Platz der Gemeinschaft frei lassen
      const b = baum(1 + rnd() * 0.7); b.position.set(x, 0, z); deko.add(b);
    }
  } else if (art === 'hof') {
    const h = haus('#fff1d6', '#e8553f'); h.position.set(-0.4, 0, -4.4); h.rotation.y = 0.05; deko.add(h);
    const weg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 7).rotateX(-Math.PI / 2), wegMat); weg.position.set(-1.0, 0.01, 0.3); weg.receiveShadow = true; deko.add(weg);
    const z1 = zaun(9); z1.position.set(1.5, 0, -6.4); deko.add(z1);
    const z2 = zaun(9); z2.position.set(6, 0, 0.1); z2.rotation.y = Math.PI / 2; deko.add(z2);
    for (const [x, z, s] of [[4.2, -3.6, 1.2], [-7, -1, 1], [7.5, -6, 1.4], [-6.5, -7, 1.3], [9, 4, 1.1]]) { const b = baum(s); b.position.set(x, 0, z); deko.add(b); }
    // Wasserfass + Brunnen-Eimer
    const fass = teil(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 20), '#2f9bff'); fass.position.set(2.3, 0.45, -1.8); deko.add(fass);
    wasser = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24).rotateX(-Math.PI / 2), smooth('#7fdcff', { roughness: 0.05, emissive: '#2a8bd8', emissiveIntensity: 0.3 }));
    wasser.position.set(2.3, 0.91, -1.8); deko.add(wasser);
    const bk = bank(); bk.position.set(3.2, 0, -1.2); bk.rotation.y = -0.6; deko.add(bk);
    const l = laterne(); l.position.set(-4.6, 0, -0.6); deko.add(l);
  } else {
    // Dorfplatz mit Brunnen
    const platz = new THREE.Mesh(new THREE.CircleGeometry(6.5, 64).rotateX(-Math.PI / 2), wegMat); platz.position.y = 0.01; platz.receiveShadow = true; deko.add(platz);
    const becken = teil(new THREE.CylinderGeometry(1.7, 1.85, 0.6, 32), '#d7deeb'); becken.position.y = 0.3; deko.add(becken);
    wasser = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40).rotateX(-Math.PI / 2), smooth('#4cc3ff', { roughness: 0.05, emissive: '#1a6fb8', emissiveIntensity: 0.3 }));
    wasser.position.y = 0.55; deko.add(wasser);
    const saeule = teil(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 16), '#d7deeb'); saeule.position.y = 1.1; deko.add(saeule);
    const schale = teil(new THREE.CylinderGeometry(0.7, 0.35, 0.25, 24), '#d7deeb'); schale.position.y = 1.9; deko.add(schale);
    const farben: [string, string][] = [['#fff1d6', '#e8553f'], ['#e6f3ff', '#3f6dff'], ['#fff6c8', '#ff9a2f'], ['#ffe3ec', '#c84aa0'], ['#e9ffe3', '#2aa36b'], ['#fff1d6', '#8a4ad8'], ['#f0ecff', '#e8553f']];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2, r = 10.5 + (i % 2) * 1.5;
      const h = haus(farben[i][0], farben[i][1], 2 + (i % 3) * 0.5);
      h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); h.lookAt(0, 0, 0); deko.add(h);
      const b = baum(1 + (i % 3) * 0.2); b.position.set(Math.cos(a + 0.42) * 12.5, 0, Math.sin(a + 0.42) * 12.5); deko.add(b);
      const lt = laterne(); lt.position.set(Math.cos(a + 0.22) * 7.2, 0, Math.sin(a + 0.22) * 7.2); deko.add(lt);
    }
    for (let i = 0; i < 4; i++) { const bk = bank(); const a = (i / 4) * Math.PI * 2 + 0.6; bk.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2); bk.lookAt(0, 0, 0); deko.add(bk); }
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = 18 + rnd() * 20; const b = baum(1 + rnd() * 0.6); b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); deko.add(b); }
  }
  // Büsche und Steine verteilt
  const busch = mergeGeometries([new THREE.SphereGeometry(0.45, 14, 10), new THREE.SphereGeometry(0.35, 12, 8).translate(0.4, -0.05, 0.1), new THREE.SphereGeometry(0.32, 12, 8).translate(-0.35, -0.08, -0.1)])!;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = (art === 'hof' ? 5 : art === 'amerika' ? 8 : 14) + rnd() * 25;
    if (art === 'amerika' && ((Math.abs(Math.cos(a) * r) < 8 && Math.sin(a) * r > -2) || Math.abs(Math.sin(a) * r + 3.7) < 2.2)) continue;   // nicht auf Gemeinschaft/Straße
    const b = teil(busch, ['#3faa3a', '#58c24a', '#2f8f3a'][i % 3], 0.03); b.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r); deko.add(b);
  }
  return {
    group: g, radius: R,
    update(t: number, camDist: number) {
      if (flagge) {
        // Flagge weht: Welle wächst vom Mast nach außen
        const pos = flagge.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + 1.3; pos.setZ(i, Math.sin(x * 2.4 - t * 5) * 0.12 * x); }
        pos.needsUpdate = true; flagge.geometry.computeVertexNormals();
      }
      if (wasser) { wasser.position.y += Math.sin(t * 2.2) * 0.0008; (wasser.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.28 + Math.sin(t * 3) * 0.06; }
      // Himmel nur nahe der Umgebung zeigen (beim Heranfliegen weich einblenden)
      const o = THREE.MathUtils.smoothstep(camDist, R * 1.15, R * 2.6);
      (sky.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - o;
      sky.visible = o < 0.999;
    },
  };
}
