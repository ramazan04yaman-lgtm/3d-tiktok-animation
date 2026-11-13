import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import { hash2, wobble } from '../math';

export interface BubblesProps {
  /** y of the heated floor where bubbles nucleate */
  floorY: number;
  /** y of the water surface */
  surfaceY: number;
  /** radius of the nucleation area */
  radius: number;
  /** fraction of nucleation sites active 0..1 */
  intensity: (t: number) => number;
  /**
   * Height above the floor (0..1 of the water column) where bubbles collapse.
   * Below 100 °C vapour bubbles condense in cooler water ("subcooled boiling"); at 1 they reach the surface.
   */
  reach: (t: number) => number;
  count?: number;
  minSize?: number;
  maxSize?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Deterministic, stateless bubble field (simplified visual model, not CFD). */
export function Bubbles({ floorY, surfaceY, radius, intensity, reach, count = 320, minSize = 0.012, maxSize = 0.045 }: BubblesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.05,
        metalness: 0.85,
        transparent: true,
        opacity: 0.75,
        envMapIntensity: 2.2,
      }),
    [],
  );

  useTimelineFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
    const depth = surfaceY - floorY;
    for (let i = 0; i < count; i++) {
      const growT = 0.12 + hash2(i, 1) * 0.25;
      const speed = 1.4 + hash2(i, 2) * 1.6; // dm/s (≈ 14–30 cm/s, realistic for vapour bubbles)
      const riseT = depth / speed;
      const period = growT + riseT + hash2(i, 3) * 0.6;
      const local = t + hash2(i, 4) * period;
      const cycle = Math.floor(local / period);
      const age = local - cycle * period;
      const emitT = t - age;
      const active = emitT >= 0 && hash2(i, cycle + 11) < intensity(emitT);
      let scale = 0;
      if (active) {
        // nucleation site, re-chosen per cycle so the pattern never visibly repeats
        const ang = hash2(i, cycle * 3 + 5) * Math.PI * 2;
        const rr = radius * Math.sqrt(hash2(i, cycle * 3 + 6));
        const size = minSize + (maxSize - minSize) * Math.pow(hash2(i, cycle + 21), 2);
        let y: number;
        let s: number;
        if (age < growT) {
          y = floorY + size * (age / growT);
          s = size * (0.2 + 0.8 * (age / growT));
        } else {
          const ra = age - growT;
          const h = Math.min(depth, speed * ra);
          y = floorY + size + h;
          const limit = reach(emitT) * depth;
          // collapse: shrink over the last 15 % before the condensation height
          const collapse = limit <= 0 ? 0 : Math.min(1, Math.max(0, (limit - h) / (0.15 * depth + 1e-6)));
          s = h >= depth - 0.01 ? 0 : size * (1 + (h / depth) * 0.6) * collapse;
          // gentle zig-zag of rising bubbles
          const w = 0.03 * (h / depth);
          _p.set(Math.cos(ang) * rr + wobble(ra * 6, i) * w, y, Math.sin(ang) * rr + wobble(ra * 6, i + 9) * w);
          scale = s;
        }
        if (age < growT) {
          _p.set(Math.cos(ang) * rr, y, Math.sin(ang) * rr);
          scale = s;
        }
      }
      _s.set(scale, scale * 0.92, scale);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled={false} renderOrder={5}>
      <sphereGeometry args={[1, 12, 10]} />
    </instancedMesh>
  );
}
