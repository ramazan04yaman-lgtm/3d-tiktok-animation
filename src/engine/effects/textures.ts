import * as THREE from 'three';

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
