import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import { hash2, wobble } from '../math';
import { getSoftDiscTexture } from './textures';
import type { Vec3 } from '../camera';

export interface SteamProps {
  origin: Vec3;
  /** emitter strength 0..1 as a function of time */
  intensity: (t: number) => number;
  count?: number;
  lifetime?: number;
  riseSpeed?: number;
  drift?: Vec3;
  spread?: number;
  size?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qz = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);

/**
 * Deterministic billboard steam. Every particle's state is computed analytically from
 * (index, time) — no integration — so frame N always looks identical regardless of render order.
 * Simplified look-alike, not a fluid simulation.
 */
export function Steam({
  origin,
  intensity,
  count = 160,
  lifetime = 3.2,
  riseSpeed = 0.75,
  drift = [0.12, 0, 0],
  spread = 0.35,
  size = 0.45,
  color = '#dfe8f2',
  opacity = 0.55,
}: SteamProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getSoftDiscTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const base = useMemo(() => new THREE.Color(color), [color]);

  useTimelineFrame((t, { camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * lifetime + hash2(i, 7) * 0.3;
      const local = t + phase;
      const cycle = Math.floor(local / lifetime);
      const age = local - cycle * lifetime;
      const emitT = t - age;
      const r = hash2(i, cycle);
      const visible = emitT >= 0 && r < intensity(emitT);
      const u = age / lifetime;
      let a = 0;
      if (visible) a = Math.min(1, u / 0.12) * Math.pow(1 - u, 1.6) * opacity;
      const seed = i * 13.1 + cycle * 7.7;
      const spreadNow = spread * (0.15 + u * 1.2);
      _p.set(
        origin[0] + drift[0] * age + wobble(age * 1.3, seed) * spreadNow,
        origin[1] + riseSpeed * age * (1 - 0.25 * u) + drift[1] * age,
        origin[2] + drift[2] * age + wobble(age * 1.1, seed + 3.3) * spreadNow,
      );
      const sc = a > 0.001 ? size * (0.35 + u * 1.6) * (0.7 + hash2(i, cycle + 99) * 0.6) : 0;
      _s.set(sc, sc, sc);
      _qz.setFromAxisAngle(Z, seed + age * 0.6 * (hash2(i, 3) - 0.5));
      _q.copy(camera.quaternion).multiply(_qz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _c.copy(base).multiplyScalar(a));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled={false} renderOrder={20}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
