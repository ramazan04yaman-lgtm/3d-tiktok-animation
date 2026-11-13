import * as THREE from 'three';
import { clamp, invLerp } from '../math';

/**
 * False-colour temperature ramp (thermal-camera style). This is a VISUALISATION —
 * water does not change colour when heated.
 */
const STOPS: [number, THREE.Color][] = [
  [0.0, new THREE.Color('#1f4fff')],
  [0.3, new THREE.Color('#19c6ff')],
  [0.55, new THREE.Color('#ffd23a')],
  [0.8, new THREE.Color('#ff6a1a')],
  [1.0, new THREE.Color('#ff1f2e')],
];

export function thermalColor(tempC: number, minC = 20, maxC = 100, out = new THREE.Color()) {
  const u = clamp(invLerp(minC, maxC, tempC));
  for (let i = 1; i < STOPS.length; i++) {
    if (u <= STOPS[i][0]) {
      const [u0, c0] = STOPS[i - 1];
      const [u1, c1] = STOPS[i];
      return out.copy(c0).lerp(c1, (u - u0) / (u1 - u0));
    }
  }
  return out.copy(STOPS[STOPS.length - 1][1]);
}

/** Incandescent-style glow colour for "heat" 0..1 (dark red → orange → yellow-white). */
export function glowColor(heat: number, out = new THREE.Color()) {
  const h = clamp(heat);
  if (h < 0.5) return out.setRGB(0.6 + h * 0.8, 0.05 + h * 0.25, 0.01);
  return out.setRGB(1.0, 0.18 + (h - 0.5) * 0.9, 0.04 + (h - 0.5) * 0.3);
}
