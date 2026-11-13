import * as THREE from 'three';
import { hash, hash2 } from '../math';

let softDisc: THREE.Texture | null = null;

/** Procedural soft radial sprite (no external image → nothing can go missing). */
export function getSoftDiscTexture() {
  if (softDisc) return softDisc;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  softDisc = new THREE.CanvasTexture(c);
  softDisc.colorSpace = THREE.SRGBColorSpace;
  return softDisc;
}

let radialFade: THREE.Texture | null = null;
/** White centre → black edge, used as alphaMap for the studio floor. */
export function getRadialFadeTexture() {
  if (radialFade) return radialFade;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, '#fff');
  grd.addColorStop(0.45, '#bbb');
  grd.addColorStop(1, '#000');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  radialFade = new THREE.CanvasTexture(c);
  return radialFade;
}

/** Deterministic value-noise canvas helper (seeded → identical every render). */
function noiseCanvas(size: number, seed: number, paint: (g: CanvasRenderingContext2D, rnd: (i: number) => number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  paint(g, (i) => hash2(seed, i));
  return c;
}

let stone: THREE.Texture | null = null;
/** Dark granite-like speckle for countertops. */
export function getStoneTexture() {
  if (stone) return stone;
  const c = noiseCanvas(512, 17, (g, r) => {
    g.fillStyle = '#9a9ca3';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(90 + r(i * 4) * 140);
      g.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + r(i * 4 + 1) * 0.5})`;
      const s = 1 + r(i * 4 + 2) * 3;
      g.fillRect(r(i * 4 + 3) * 512, r(i * 4 + 5) * 512, s, s);
    }
  });
  stone = new THREE.CanvasTexture(c);
  stone.colorSpace = THREE.SRGBColorSpace;
  stone.wrapS = stone.wrapT = THREE.RepeatWrapping;
  stone.repeat.set(6, 3);
  stone.anisotropy = 8;
  return stone;
}

let crema: THREE.Texture | null = null;
/** Espresso crema: hazel base with darker "tiger stripes" and fine bubbles. */
export function getCremaTexture() {
  if (crema) return crema;
  const c = noiseCanvas(512, 31, (g, r) => {
    const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grd.addColorStop(0, '#c48a52');
    grd.addColorStop(0.7, '#a96d38');
    grd.addColorStop(1, '#6e3f1c');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      const a = r(i) * Math.PI * 2;
      const d = 40 + r(i + 1000) * 210;
      g.strokeStyle = `rgba(90,48,20,${0.12 + r(i + 2000) * 0.18})`;
      g.lineWidth = 2 + r(i + 3000) * 6;
      g.beginPath();
      g.arc(256, 256, d, a, a + 0.3 + r(i + 4000) * 0.9);
      g.stroke();
    }
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(235,200,150,${0.15 + r(i + 5000) * 0.3})`;
      g.beginPath();
      g.arc(r(i + 6000) * 512, r(i + 7000) * 512, 0.6 + r(i + 8000) * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  });
  crema = new THREE.CanvasTexture(c);
  crema.colorSpace = THREE.SRGBColorSpace;
  return crema;
}

let grounds: THREE.Texture | null = null;
/** Ground coffee granules. */
export function getGroundsTexture() {
  if (grounds) return grounds;
  const c = noiseCanvas(256, 47, (g, r) => {
    g.fillStyle = '#6b4426';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6000; i++) {
      const v = r(i);
      g.fillStyle = v < 0.5 ? `rgba(40,22,10,${0.5 + v})` : `rgba(150,105,65,${v - 0.3})`;
      g.fillRect(r(i + 9000) * 256, r(i + 19000) * 256, 1 + r(i + 29000) * 2, 1 + r(i + 39000) * 2);
    }
  });
  grounds = new THREE.CanvasTexture(c);
  grounds.colorSpace = THREE.SRGBColorSpace;
  grounds.wrapS = grounds.wrapT = THREE.RepeatWrapping;
  return grounds;
}

let stream: THREE.Texture | null = null;
/** Vertical streaks for flowing liquid (scrolled along V). */
export function getStreamTexture() {
  if (stream) return stream;
  const c = noiseCanvas(64, 53, (g, r) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 120; i++) {
      const v = Math.floor(70 + r(i) * 120);
      g.fillStyle = `rgba(${v},${v},${v},0.6)`;
      g.fillRect(r(i + 100) * 64, r(i + 200) * 64, 1 + r(i + 300) * 3, 6 + r(i + 400) * 26);
    }
  });
  stream = new THREE.CanvasTexture(c);
  stream.wrapS = stream.wrapT = THREE.RepeatWrapping;
  return stream;
}

let dial: THREE.Texture | null = null;
/** Manometer dial 0–16 bar with green brew zone (8–11 bar). Needle at 0 bar points to −135°. */
export function getPressureDialTexture() {
  if (dial) return dial;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2f0ea';
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  g.fill();
  const ang = (bar: number) => ((-135 + (bar / 16) * 270) * Math.PI) / 180 - Math.PI / 2;
  g.lineWidth = 34;
  g.strokeStyle = '#3fb06a';
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.36, ang(8), ang(11));
  g.stroke();
  g.strokeStyle = '#d24a3a';
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.36, ang(13), ang(16));
  g.stroke();
  g.strokeStyle = '#1b1d22';
  g.fillStyle = '#1b1d22';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 42px Inter, sans-serif';
  for (let b = 0; b <= 16; b++) {
    const a = ang(b);
    const major = b % 2 === 0;
    const r0 = S * (major ? 0.38 : 0.41);
    g.lineWidth = major ? 7 : 4;
    g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
    g.lineTo(S / 2 + Math.cos(a) * S * 0.46, S / 2 + Math.sin(a) * S * 0.46);
    g.stroke();
    if (b % 4 === 0) g.fillText(String(b), S / 2 + Math.cos(a) * S * 0.28, S / 2 + Math.sin(a) * S * 0.28);
  }
  g.font = '800 40px Inter, sans-serif';
  g.fillText('BAR', S / 2, S * 0.7);
  dial = new THREE.CanvasTexture(c);
  dial.colorSpace = THREE.SRGBColorSpace;
  dial.anisotropy = 8;
  return dial;
}

void hash;
