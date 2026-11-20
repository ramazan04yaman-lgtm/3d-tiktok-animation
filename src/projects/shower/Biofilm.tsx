import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { noise3 } from '../../engine/geometry/noise';
import { surfaceNets } from '../../engine/geometry/surfaceNets';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import * as track from './script';

/**
 * Magnifier into the biofilm (≈ 1000× magnified): bacteria embedded in a slimy matrix of
 * extracellular polymers (EPS) on a limescale crust. In the second appearance the slender,
 * waxy mycobacteria are highlighted (pink, acid-fast stain colour) and multiply.
 */
export function Biofilm({ center, radius }: { center: readonly [number, number, number]; radius: number }) {
  const R = radius;
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    // slime matrix: lumpy mound sitting on the crust (SDF mesh)
    const matrix = surfaceNets(
      (x, y, z) => {
        const base = y + 0.45 - 0.18 * Math.max(0, 1 - Math.hypot(x, z) / 0.9) - 0.12 * noise3(x * 3, 0, z * 3);
        const blob = Math.hypot(x, y + 0.15, z) - 0.62 + 0.08 * noise3(x * 4, y * 4, z * 4);
        return Math.max(Math.min(base, blob), Math.hypot(x, y, z) - 0.92);
      },
      { min: [-1, -1, -1], max: [1, 1, 1], step: 0.035, project: 1 },
    );
    matrix.scale(R, R, R);
    const crust = new THREE.CylinderGeometry(0.93 * R, 0.93 * R, 0.12 * R, 48, 1);
    crust.translate(0, -0.66 * R, 0);
    return { matrix, crust, rod: new THREE.CapsuleGeometry(1, 2.6, 6, 12), coccus: new THREE.SphereGeometry(1, 14, 10) };
  }, [R]);
  const mats = useMemo(() => {
    const shell = createXRayMaterial('#9fe0ff', []);
    const back = new THREE.MeshPhysicalMaterial({ color: '#0d1418', roughness: 0.3, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.BackSide });
    const slime = new THREE.MeshPhysicalMaterial({ color: '#b98a6e', roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
    const crust = new THREE.MeshPhysicalMaterial({ color: '#e9e4d8', roughness: 0.8, transparent: true });
    const bact = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.8, transparent: true, emissive: '#ff3c78', emissiveIntensity: 0 });
    return { shell, back, slime, crust, bact };
  }, []);
  const NB = 70;
  const palette = useMemo(() => ['#7fae63', '#c98c4a', '#8f7cc4', '#4fa9bf', '#b5b0a0'].map((c) => new THREE.Color(c)), []);
  const MYCO = new THREE.Color('#ff5a8c');
  const rodRef = useRef<THREE.InstancedMesh>(null);
  const cocRef = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), e: new THREE.Euler() }), []);

  useTimelineFrame((t) => {
    const a = track.magA(t);
    const b = track.magB(t);
    const v = Math.max(a, b);
    const g = group.current;
    if (!g) return;
    g.visible = v > 0.002;
    if (!g.visible) return;
    g.scale.setScalar(0.6 + 0.4 * v);
    mats.shell.uniforms.uOpacity.value = v;
    mats.back.opacity = 0.75 * v;
    mats.slime.opacity = 0.38 * v;
    mats.crust.opacity = v;
    mats.bact.opacity = v;
    // mycobacteria multiply during the surprise
    const mycoShare = b * Math.min(1, Math.max(0, (t - 43.4) / 3.5));
    const rod = rodRef.current!;
    const coc = cocRef.current!;
    let ri = 0;
    let ci = 0;
    for (let i = 0; i < NB; i++) {
      const u = hash2(i, 1) * 6.28;
      const rr = Math.sqrt(hash2(i, 2)) * 0.62 * R;
      const y = (-0.5 + 0.75 * hash2(i, 3)) * R * (1 - (rr / R) * 0.5);
      tmp.p.set(Math.cos(u) * rr, y, Math.sin(u) * rr);
      tmp.p.x += 0.01 * R * Math.sin(t * 1.3 + i);
      tmp.e.set(hash2(i, 4) * 3, hash2(i, 5) * 3 + 0.1 * Math.sin(t + i), hash2(i, 6) * 3);
      tmp.q.setFromEuler(tmp.e);
      const isMyco = hash2(i, 7) < mycoShare * 0.6;
      const isRod = isMyco || hash2(i, 8) < 0.6;
      const grow = a > 0.002 ? Math.min(1, Math.max(0, (t - 19.0 - hash2(i, 9) * 2.5) / 0.8)) : 1;
      const sc = (isRod ? (isMyco ? 0.02 : 0.026) : 0.034) * R * grow;
      tmp.s.set(sc, isMyco ? sc * 1.5 : sc, sc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      tmp.c.copy(isMyco ? MYCO : palette[Math.floor(hash2(i, 10) * palette.length)]);
      if (b > 0.002 && !isMyco) tmp.c.multiplyScalar(0.45);
      if (isRod) {
        rod.setMatrixAt(ri, tmp.m);
        rod.setColorAt(ri++, tmp.c);
      } else {
        coc.setMatrixAt(ci, tmp.m);
        coc.setColorAt(ci++, tmp.c);
      }
    }
    mats.bact.emissiveIntensity = 0;
    for (const m of [rod, coc]) {
      m.count = m === rod ? ri : ci;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={center as [number, number, number]} name="BiofilmMagnifier">
      <mesh material={mats.back} renderOrder={30}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
      <mesh geometry={geo.crust} material={mats.crust} renderOrder={31} />
      <instancedMesh ref={rodRef} args={[geo.rod, mats.bact, NB]} frustumCulled={false} renderOrder={32} />
      <instancedMesh ref={cocRef} args={[geo.coccus, mats.bact, NB]} frustumCulled={false} renderOrder={32} />
      <mesh geometry={geo.matrix} material={mats.slime} renderOrder={33} />
      <mesh material={mats.shell} renderOrder={35}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
    </group>
  );
}
