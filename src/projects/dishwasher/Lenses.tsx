import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

/** series-standard magnifier: dark back sphere + fresnel shell, contents grow in */
function Lens({ center, radius, visible, tint = '#9fe0ff', children }: { center: readonly number[]; radius: number; visible: (t: number) => number; tint?: string; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const mats = useMemo(() => ({ shell: createXRayMaterial(tint, []), back: new THREE.MeshPhysicalMaterial({ color: '#0c1218', roughness: 0.3, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.BackSide }) }), [tint]);
  useTimelineFrame((t) => {
    const v = visible(t);
    if (!g.current) return;
    g.current.visible = v > 0.002;
    g.current.scale.setScalar(0.05 + 0.95 * v);
    mats.shell.uniforms.uOpacity.value = v;
    mats.back.opacity = 0.8 * v;
  });
  return (
    <group ref={g} position={center as [number, number, number]}>
      <mesh material={mats.back} renderOrder={30}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
      {children}
      <mesh material={mats.shell} renderOrder={35}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
    </group>
  );
}

/** ion exchanger: resin beads catch calcium ions (white) and release sodium ions (yellow) */
function Softener({ R }: { R: number }) {
  const beads = useRef<THREE.InstancedMesh>(null);
  const ions = useRef<THREE.InstancedMesh>(null);
  const NB = 26;
  const NI = 60;
  const mats = useMemo(() => ({ bead: new THREE.MeshPhysicalMaterial({ color: '#c98a2e', roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.9 }), ion: new THREE.MeshPhysicalMaterial({ roughness: 0.2, clearcoat: 1 }) }), []);
  const pos = useMemo(() => Array.from({ length: NB }, (_, i) => new THREE.Vector3((hash2(i, 1) - 0.5) * 1.3 * R, (hash2(i, 2) - 0.5) * 1.3 * R, (hash2(i, 3) - 0.5) * 0.9 * R)), [R]);
  useTimelineFrame((t) => {
    const bm = beads.current!;
    pos.forEach((p, i) => {
      _m.compose(p, _q.identity(), _s.setScalar(0.16 * R));
      bm.setMatrixAt(i, _m);
    });
    bm.instanceMatrix.needsUpdate = true;
    const im = ions.current!;
    const p0 = track.T.soften[0];
    for (let i = 0; i < NI; i++) {
      const ca = i < NI / 2;
      const b = pos[i % NB];
      const life = Math.min(1, Math.max(0, (t - p0 - (i % 30) * 0.05) / 1.6));
      if (ca) {
        // calcium drifts in with the water and sticks to a bead
        _p.set(-1.2 * R, b.y + (hash2(i, 4) - 0.5) * 0.2 * R, b.z).lerp(_s.copy(b).add(new THREE.Vector3(0, 0.17 * R, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), hash2(i, 5) * 6.28)), life);
        im.setColorAt(i, _c.set('#f4f4f4'));
      } else {
        // sodium leaves the bead and is washed out
        _p.copy(b).add(new THREE.Vector3(0, 0.17 * R, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), hash2(i, 5) * 6.28)).lerp(new THREE.Vector3(1.2 * R, b.y, b.z), life);
        im.setColorAt(i, _c.set('#f2c81c'));
      }
      _m.compose(_p, _q.identity(), _s.setScalar(0.045 * R * (1 - Math.max(0, (Math.abs(_p.x) - 0.85 * R) / (0.2 * R)))));
      im.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={beads} args={[undefined, mats.bead, NB]} frustumCulled={false} renderOrder={31}>
        <sphereGeometry args={[1, 24, 16]} />
      </instancedMesh>
      <instancedMesh ref={ions} args={[undefined, mats.ion, NI]} frustumCulled={false} renderOrder={32}>
        <sphereGeometry args={[1, 12, 10]} />
      </instancedMesh>
    </>
  );
}

/** enzymes on a plate: amylase (blue) cuts starch chains (white beads), protease (green) cuts protein (yellow coils) */
function Enzymes({ R }: { R: number }) {
  const beads = useRef<THREE.InstancedMesh>(null);
  const enz = useRef<THREE.InstancedMesh>(null);
  const NC = 4;
  const PER = 16;
  const mats = useMemo(() => ({ plate: new THREE.MeshPhysicalMaterial({ color: '#f2f0ea', roughness: 0.15, clearcoat: 1 }), bead: new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.6 }), enz: new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }) }), []);
  useTimelineFrame((t) => {
    const t0 = track.T.enzymes[0] + 1.4;
    const bm = beads.current!;
    const em = enz.current!;
    for (let c = 0; c < NC; c++) {
      const starch = c % 2 === 0;
      const y0 = -0.35 * R + c * 0.11 * R;
      const cutT = t0 + 1.0 + c * 0.7;
      const cutAt = 5 + (c % 3) * 3;
      const sep = Math.max(0, t - cutT);
      for (let k = 0; k < PER; k++) {
        const id = c * PER + k;
        const x = (-0.6 + (1.2 * k) / (PER - 1)) * R;
        const piece = k < cutAt ? -1 : 1;
        _p.set(x + piece * sep * 0.06 * R, y0 + 0.02 * R * Math.sin(k * 1.3 + c) + sep * 0.05 * R * (k % 3), (-0.2 + c * 0.13) * R + (starch ? 0 : 0.02 * R * Math.cos(k * 2)));
        _m.compose(_p, _q.identity(), _s.setScalar((starch ? 0.035 : 0.03) * R));
        bm.setMatrixAt(id, _m);
        bm.setColorAt(id, _c.set(starch ? '#f6f2e6' : '#e8c35a'));
      }
      // the enzyme moves along the chain to the cut site
      const k0 = Math.min(cutAt, Math.max(0, (t - t0) * 6));
      const x = (-0.6 + (1.2 * k0) / (PER - 1)) * R;
      _m.compose(_p.set(x, y0 + 0.07 * R, (-0.2 + c * 0.13) * R), _q.setFromEuler(new THREE.Euler(t + c, t * 0.7, 0)), _s.set(0.075 * R, 0.06 * R, 0.065 * R));
      em.setMatrixAt(c, _m);
      em.setColorAt(c, _c.set(starch ? '#4f8ff0' : '#5cc46a'));
    }
    for (const m of [bm, em]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  });
  return (
    <>
      <mesh material={mats.plate} position={[0, -0.5 * R, 0]} renderOrder={31}>
        <cylinderGeometry args={[0.85 * R, 0.85 * R, 0.08 * R, 48]} />
      </mesh>
      <instancedMesh ref={beads} args={[undefined, mats.bead, NC * PER]} frustumCulled={false} renderOrder={32}>
        <sphereGeometry args={[1, 12, 10]} />
      </instancedMesh>
      <instancedMesh ref={enz} args={[undefined, mats.enz, NC]} frustumCulled={false} renderOrder={33}>
        <dodecahedronGeometry args={[1, 1]} />
      </instancedMesh>
    </>
  );
}

/** rinse aid lowers the surface tension: droplets spread into a thin film that runs off */
function Rinse({ R }: { R: number }) {
  const drops = useRef<THREE.InstancedMesh>(null);
  const N = 22;
  const mats = useMemo(() => ({ glass: new THREE.MeshPhysicalMaterial({ color: '#dff0ff', roughness: 0.03, transparent: true, opacity: 0.35, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), drop: new THREE.MeshPhysicalMaterial({ color: '#cfe9ff', roughness: 0.02, metalness: 0.3, clearcoat: 1, transparent: true, opacity: 0.8 }) }), []);
  useTimelineFrame((t) => {
    const k = Math.min(1, Math.max(0, (t - track.T.rinse[0] - 1.6) / 1.6));
    const run = Math.max(0, t - track.T.rinse[0] - 3.0);
    const dm = drops.current!;
    for (let i = 0; i < N; i++) {
      const r = (0.06 + 0.05 * hash2(i, 1)) * R;
      _p.set((hash2(i, 2) - 0.5) * 1.1 * R, (hash2(i, 3) - 0.5) * 1.1 * R - run * 0.5 * R, 0.06 * R);
      _m.compose(_p, _q.identity(), _s.set(r * (1 + 1.2 * k), r * (1 + 1.2 * k), r * (1 - 0.85 * k)));
      dm.setMatrixAt(i, _m);
    }
    dm.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <mesh material={mats.glass} renderOrder={31}>
        <boxGeometry args={[1.4 * R, 1.4 * R, 0.05 * R]} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, mats.drop, N]} frustumCulled={false} renderOrder={32}>
        <sphereGeometry args={[1, 20, 14]} />
      </instancedMesh>
    </>
  );
}

export function Lenses() {
  const R = 0.75;
  return (
    <>
      <Lens center={track.LENS.soft} radius={R} visible={track.lensSoft} tint="#ffd27a">
        <Softener R={R} />
      </Lens>
      <Lens center={track.LENS.enzyme} radius={R} visible={track.lensEnzyme} tint="#9fe0ff">
        <Enzymes R={R} />
      </Lens>
      <Lens center={track.LENS.rinse} radius={R} visible={track.lensRinse} tint="#bfe6ff">
        <Rinse R={R} />
      </Lens>
    </>
  );
}
