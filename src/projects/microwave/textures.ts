import * as THREE from 'three';
import { hash2 } from '../../engine/math';

let soup: THREE.Texture | null = null;
/** Creamy tomato soup with a cream swirl and herbs (deterministic procedural texture). */
export function getSoupTexture() {
  if (soup) return soup;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = (i: number) => hash2(71, i);
  const grd = g.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  grd.addColorStop(0, '#c9431c');
  grd.addColorStop(0.75, '#b53716');
  grd.addColorStop(1, '#8e2a10');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(${200 + r(i) * 40},${80 + r(i + 1e4) * 40},${40 + r(i + 2e4) * 20},0.25)`;
    g.beginPath();
    g.arc(r(i + 3e4) * S, r(i + 4e4) * S, 2 + r(i + 5e4) * 6, 0, Math.PI * 2);
    g.fill();
  }
  // cream swirl
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = `rgba(245,226,200,${[0.18, 0.32, 0.5][k]})`;
    g.lineWidth = [16, 9, 4][k];
    g.beginPath();
    for (let a = 0.6; a < Math.PI * 3.2; a += 0.05) {
      const rr = 30 + a * 15 + Math.sin(a * 3) * 4;
      const x = S / 2 + Math.cos(a) * rr;
      const y = S / 2 + Math.sin(a) * rr;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // herbs
  for (let i = 0; i < 38; i++) {
    const a = r(i + 6e4) * Math.PI * 2;
    const d = Math.sqrt(r(i + 7e4)) * S * 0.36;
    g.fillStyle = r(i + 8e4) > 0.5 ? '#3f7a2a' : '#2c5c1d';
    g.save();
    g.translate(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d);
    g.rotate(r(i + 9e4) * 6);
    g.fillRect(-3, -1.5, 6 + r(i) * 5, 3);
    g.restore();
  }
  soup = new THREE.CanvasTexture(c);
  soup.colorSpace = THREE.SRGBColorSpace;
  soup.anisotropy = 8;
  return soup;
}

let mesh: THREE.Texture | null = null;
/** Perforated metal screen of the door (holes ≪ wavelength keep microwaves inside). */
export function getDoorMeshTexture() {
  if (mesh) return mesh;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#000000';
  for (const [x, y] of [[16, 16], [48, 16], [0, 48], [32, 48], [64, 48]]) {
    g.beginPath();
    g.arc(x, y, 11, 0, Math.PI * 2);
    g.fill();
  }
  mesh = new THREE.CanvasTexture(c);
  mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
  mesh.repeat.set(70, 50);
  mesh.anisotropy = 8;
  return mesh;
}

/** Digital display with cyan 7-segment-style digits; returns a redraw function. */
export function createDisplay() {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 120;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  const draw = (text: string) => {
    // include font readiness in the cache key → never keep a frame drawn with a fallback font
    const ready = document.fonts.check("500 88px 'JetBrains Mono'");
    const key = text + (ready ? '' : '#');
    if (key === last) return;
    last = key;
    g.fillStyle = '#05080a';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#7fe0ff';
    g.shadowColor = '#3ac8ff';
    g.shadowBlur = 14;
    g.font = "500 88px 'JetBrains Mono', monospace";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 4);
    tex.needsUpdate = true;
  };
  draw('2:00');
  return { texture: tex, draw };
}
