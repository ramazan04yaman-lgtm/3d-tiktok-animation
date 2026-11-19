import * as THREE from 'three';
import { noise3 } from '../../engine/geometry/noise';
import { len3, sdEllipsoid, segDist, smax, smin, surfaceNets } from '../../engine/geometry/surfaceNets';

/**
 * Episode 6 world: 1 unit = 1 cm. Index finger pointing up (+y), finger pad facing the camera (+z),
 * nail on the back (−z). The paper edge slides along x across the pad at y = CUT.y.
 */
export const CUT = { y: 4.78, x0: -0.62, x1: 0.62, z: 0.86 };
/** contact point of the paper edge with the finger pad (centre of the cut) */
export const EDGE = new THREE.Vector3(0, CUT.y, CUT.z);

export function sdFinger(x: number, y: number, z: number) {
  // phalanges (distal, middle, proximal) with slightly flattened cross-section
  const zz = z * 1.08;
  let d = segDist(x, y, zz, [0, 4.15, 0], [0, 5.72, -0.02]) - 0.76;
  d = smin(d, segDist(x, y, zz, [0, 1.95, -0.02], [0, 4.15, 0]) - 0.8, 0.12);
  d = smin(d, segDist(x, y, zz, [0, -2.5, -0.05], [0, 1.95, -0.02]) - 0.88, 0.14);
  // finger pad and fleshy palmar side
  d = smin(d, sdEllipsoid(x, y, z, [0, 4.95, 0.2], [0.72, 1.0, 0.64]), 0.25);
  d = smin(d, sdEllipsoid(x, y, z, [0, 3.05, 0.18], [0.74, 0.9, 0.66]), 0.25);
  // knuckles on the back
  d = smin(d, sdEllipsoid(x, y, z, [0, 4.1, -0.5], [0.62, 0.32, 0.36]), 0.18);
  d = smin(d, sdEllipsoid(x, y, z, [0, 1.92, -0.55], [0.68, 0.36, 0.4]), 0.18);
  // flexion creases (palmar)
  const pal = Math.max(0, Math.min(1, z / 0.4));
  d += 0.035 * pal * (Math.exp(-(((y - 4.12) / 0.035) ** 2)) + Math.exp(-(((y - 1.98) / 0.035) ** 2)) + 0.6 * Math.exp(-(((y - 2.12) / 0.03) ** 2)));
  // nail bed recess
  d = smax(d, -(sdEllipsoid(x, y, z, [0, 5.42, -0.86], [0.56, 0.92, 0.16])), 0.05);
  d += 0.004 * noise3(x * 6, y * 6, z * 6);
  return d;
}

export function sdNail(x: number, y: number, z: number) {
  let d = sdEllipsoid(x, y, z, [0, 5.4, -0.69], [0.55, 0.92, 0.12]);
  d = smax(d, y - 6.18, 0.04);
  return smax(d, -(len3(x, y - 5.0, z + 0.2) - 0.62), 0.04);
}

export const fingerGeometry = () => surfaceNets(sdFinger, { min: [-1.0, -2.6, -1.05], max: [1.0, 6.6, 1.05], step: 0.028, project: 2 });
export const nailGeometry = () => surfaceNets(sdNail, { min: [-0.7, 4.3, -0.95], max: [0.7, 6.4, -0.4], step: 0.018, project: 2 });

export interface FingerUniforms {
  uCut: { value: number };
  uOpen: { value: number };
  uPress: { value: number };
  uEdgeX: { value: number };
  uLine: { value: number };
}

/**
 * Skin: subsurface-like warm sheen, fingerprint ridges (analytic bump in the shader, ≈ 0.45 mm pitch),
 * indentation along the paper edge and the cut (thin red slit that opens slightly).
 */
export function createSkinMaterial(u: FingerUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#d79f86',
    roughness: 0.5,
    sheen: 0.8,
    sheenColor: new THREE.Color('#ffb59a'),
    sheenRoughness: 0.45,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    transparent: true,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    const decl = `uniform float uCut;\nuniform float uOpen;\nuniform float uPress;\nuniform float uEdgeX;\nuniform float uLine;\nvarying vec3 vLocal;\nvarying vec3 vAx;\nvarying vec3 vAy;\n`;
    sh.vertexShader =
      decl +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = position;
        float pad = smoothstep(0.25, 0.6, position.z) * smoothstep(3.9, 4.3, position.y);
        float along = smoothstep(uEdgeX - 1.6, uEdgeX - 0.6, position.x) * (1.0 - smoothstep(uEdgeX + 0.6, uEdgeX + 1.6, position.x));
        transformed.z -= uPress * 0.07 * pad * exp(-pow((position.y - ${CUT.y.toFixed(3)}) / 0.09, 2.0)) * mix(0.35, 1.0, along);
        vLocal = position;
        vAx = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
        vAy = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));`,
      );
    sh.fragmentShader =
      decl +
      sh.fragmentShader
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            // fingerprint whorl on the pad
            vec2 q = vec2(vLocal.x, (vLocal.y - 4.95) * 0.82);
            float r = length(q);
            float ph = r / 0.046 * 6.2831 + 0.6 * atan(q.y, q.x);
            float msk = smoothstep(0.3, 0.6, vLocal.z) * smoothstep(3.95, 4.3, vLocal.y) * (1.0 - smoothstep(5.9, 6.3, vLocal.y));
            vec3 g = vec3(q.x, q.y * 0.82, 0.0) / max(r, 1e-3) * cos(ph) * 0.11 * msk;
            vec3 gv = vAx * g.x + vAy * g.y;
            normal = normalize(normal - gv + normal * dot(normal, gv));
          }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            float msk = smoothstep(0.3, 0.6, vLocal.z) * smoothstep(3.95, 4.3, vLocal.y);
            vec2 q = vec2(vLocal.x, (vLocal.y - 4.95) * 0.82);
            float ridge = 0.5 + 0.5 * cos(length(q) / 0.046 * 6.2831 + 0.6 * atan(q.y, q.x));
            diffuseColor.rgb *= 1.0 - 0.07 * ridge * msk;
            // cut: slit along x at the edge line, revealed up to the current progress
            float xEnd = mix(${CUT.x1.toFixed(3)}, ${CUT.x0.toFixed(3)}, uCut);
            float inSeg = step(xEnd, vLocal.x) * step(vLocal.x, ${CUT.x1.toFixed(3)}) * smoothstep(0.35, 0.6, vLocal.z);
            float dy = abs(vLocal.y - ${CUT.y.toFixed(3)} - 0.012 * sin(vLocal.x * 9.0));
            float w = 0.004 + 0.012 * uOpen;
            float slit = (1.0 - smoothstep(w, w + 0.006, dy)) * inSeg * step(0.001, uCut);
            float rim = (1.0 - smoothstep(w + 0.004, w + 0.03, dy)) * inSeg * step(0.001, uCut);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.42, 0.36), rim * 0.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.04, 0.04), slit);
            // contact line under the paper edge (pressure)
            float line = (1.0 - smoothstep(0.0, 0.03, abs(vLocal.y - ${CUT.y.toFixed(3)}))) * smoothstep(0.35, 0.6, vLocal.z) * uLine;
            line *= 1.0 - smoothstep(0.3, 0.9, abs(vLocal.x - uEdgeX * 0.0));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.62, 0.18), line);
          }`,
        );
  };
  m.customProgramCacheKey = () => 'mx-finger-skin';
  return m;
}
