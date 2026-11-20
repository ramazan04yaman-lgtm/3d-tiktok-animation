import * as THREE from 'three';
import { noise3 } from '../../engine/geometry/noise';
import { sdEllipsoid, segDist, smax, smin, surfaceNets } from '../../engine/geometry/surfaceNets';
import { hash2 } from '../../engine/math';

/**
 * Episode 8 world: 1 unit = 5 cm. A beech wooden spoon stands upright (handle down), bowl facing +z.
 * The magnified wood block (≈ 4 mm of wood) appears in front of the bowl at BLOCK.
 */
export const BOWL = new THREE.Vector3(0, 5.2, 0);
export const CRACK = { x: 0.06, y0: 4.62, y1: 5.86 };
export const BLOCK = new THREE.Vector3(0, 5.15, 0.9);
export const BW = { x: 1.3, y: 0.62, z: 0.9 };

export function sdSpoon(x: number, y: number, z: number) {
  // bowl: flattened ellipsoid, hollowed on the front
  let d = sdEllipsoid(x, y, z, [0, 5.2, 0], [0.6, 0.86, 0.17]);
  d = smax(d, -sdEllipsoid(x, y, z, [0, 5.22, 0.21], [0.53, 0.78, 0.17]), 0.05);
  // neck + handle (slightly flattened, tapering)
  const t = Math.max(0, Math.min(1, (4.4 - y) / 4.2));
  const r = 0.11 + 0.05 * t;
  d = smin(d, segDist(x, y, z * 1.25, [0, 4.45, -0.02], [0, 0.25, -0.04]) - r, 0.18);
  d += 0.002 * noise3(x * 20, y * 4, z * 20);
  return d;
}
export const spoonGeometry = () => surfaceNets(sdSpoon, { min: [-0.7, 0.05, -0.3], max: [0.7, 6.15, 0.3], step: 0.012, project: 2 });

let _tex: THREE.CanvasTexture | null = null;
/** procedural beech: warm base, fine grain lines along v (= along the spoon), small pores */
export function woodTexture() {
  if (_tex) return _tex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d8a46c';
  g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 260; i++) {
    const x0 = hash2(i, 1) * 512;
    g.strokeStyle = `rgba(${150 + hash2(i, 2) * 40},${95 + hash2(i, 3) * 30},${50 + hash2(i, 4) * 20},${0.12 + hash2(i, 5) * 0.2})`;
    g.lineWidth = 0.6 + hash2(i, 6) * 2.2;
    g.beginPath();
    for (let y = 0; y <= 1024; y += 16) {
      const x = x0 + 8 * Math.sin(y * 0.01 + i) + 4 * Math.sin(y * 0.037 + i * 2);
      if (y === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(110,70,40,${0.15 + hash2(i, 9) * 0.2})`;
    g.fillRect(hash2(i, 7) * 512, hash2(i, 8) * 1024, 1, 2 + hash2(i, 10) * 4);
  }
  _tex = new THREE.CanvasTexture(c);
  _tex.colorSpace = THREE.SRGBColorSpace;
  _tex.wrapS = _tex.wrapT = THREE.RepeatWrapping;
  return _tex;
}

export interface WoodUniforms {
  uWet: { value: number };
  uFat: { value: number };
  uSauce: { value: number };
  uDry: { value: number };
}

/**
 * Magnified wood block: long faces show grain (vessels as fine dark grooves along x), the end faces
 * show growth rings and open pores. Wet wood darkens, fat leaves a yellow stain near the crack.
 */
export function createBlockMaterial(u: WoodUniforms) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.62, clearcoat: 0.1, transparent: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vL;\nvarying vec3 vNl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position;\nvNl = normal;');
    sh.fragmentShader =
      'uniform float uWet;\nuniform float uFat;\nuniform float uSauce;\nuniform float uDry;\nvarying vec3 vL;\nvarying vec3 vNl;\n' +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 base = vec3(0.85, 0.62, 0.40);
        vec3 c;
        if (abs(vNl.x) > 0.6) {
          // end grain: growth rings + open vessels (pores)
          float r = length(vec2(vL.y + 2.2, vL.z + 0.6));
          float ring = smoothstep(0.75, 1.0, fract(r * 3.2));
          vec2 cell = floor(vec2(vL.y, vL.z) * 26.0);
          vec2 f = fract(vec2(vL.y, vL.z) * 26.0) - 0.5;
          float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          float pore = (1.0 - smoothstep(0.12, 0.2, length(f))) * step(0.55, h);
          c = mix(base, base * 0.72, ring) * (1.0 - 0.65 * pore);
        } else {
          float grain = 0.5 + 0.5 * sin(vL.z * 90.0 + vL.y * 70.0 + sin(vL.x * 3.0) * 2.0);
          float groove = smoothstep(0.92, 1.0, fract(vL.z * 26.0 + vL.y * 19.0));
          c = base * (0.9 + 0.1 * grain) * (1.0 - 0.3 * groove);
        }
        // liquid uptake from the top surface and the crack (capillary)
        float top = ${(BW.y / 2).toFixed(3)} - vL.y;
        float nearCrack = exp(-pow(vL.z / 0.12, 2.0));
        float soak = clamp(1.0 - (top * 2.2) / max(uWet, 1e-3), 0.0, 1.0) * step(0.001, uWet);
        c *= 1.0 - 0.32 * soak * (1.0 - uDry);
        float fat = clamp(1.0 - top * 3.5 / max(uFat, 1e-3), 0.0, 1.0) * step(0.001, uFat) * (0.4 + 0.6 * nearCrack);
        c = mix(c, vec3(0.86, 0.66, 0.22), 0.5 * fat);
        float sauce = clamp(1.0 - top * 6.0 / max(uSauce, 1e-3), 0.0, 1.0) * step(0.001, uSauce) * nearCrack;
        c = mix(c, vec3(0.45, 0.12, 0.08), 0.6 * sauce);
        diffuseColor.rgb = pow(c, vec3(2.2));`,
      );
  };
  m.customProgramCacheKey = () => 'mx-wood-block';
  return m;
}
