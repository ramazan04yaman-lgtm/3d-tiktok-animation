import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { LENS, LENS_R } from './script';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function Lens({ center, radius, visible, tint = '#9fe0ff', children }: { center: readonly number[]; radius: number; visible: (t: number) => number; tint?: string; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const mats = useMemo(() => ({ shell: createXRayMaterial(tint, []), back: new THREE.MeshPhysicalMaterial({ color: '#0c1218', roughness: 0.3, transparent: true, opacity: 0.88, depthWrite: false, side: THREE.BackSide }) }), [tint]);
  useTimelineFrame((t) => {
    const k = visible(t);
    if (!g.current) return;
    g.current.visible = k > 0.002;
    g.current.scale.setScalar(0.05 + 0.95 * k);
    mats.shell.uniforms.uOpacity.value = k;
    mats.back.opacity = 0.88 * k;
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

/** synaptic cleft: vesicles fuse, transmitters cross and dock on receptors, the next cell lights up */
function Synapse({ R }: { R: number }) {
  const ves = useRef<THREE.InstancedMesh>(null);
  const tx = useRef<THREE.InstancedMesh>(null);
  const rec = useRef<THREE.InstancedMesh>(null);
  const NV = 12, NT = 60, NR = 9;
  const PRE = 0.1 * R, POST = -0.12 * R;
  const mats = useMemo(() => ({
    pre: new THREE.MeshPhysicalMaterial({ color: '#8fa0ff', roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    mem: new THREE.MeshPhysicalMaterial({ color: '#b9c4ff', roughness: 0.3, clearcoat: 0.5 }),
    post: new THREE.MeshStandardMaterial({ color: '#b07fff', emissive: new THREE.Color('#d0a0ff'), emissiveIntensity: 0.2, roughness: 0.4 }),
    ves: new THREE.MeshPhysicalMaterial({ color: '#ffe6a0', roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.9 }),
    tx: new THREE.MeshBasicMaterial({ color: '#ffd23a', toneMapped: false }),
    rec: new THREE.MeshStandardMaterial({ color: '#5cc46a', emissive: new THREE.Color('#5cff7a'), emissiveIntensity: 0.1, roughness: 0.4 }),
  }), []);
  const recX = useMemo(() => Array.from({ length: NR }, (_, i) => (-0.48 + (0.96 * i) / (NR - 1)) * R), [R]);
  useTimelineFrame((t) => {
    const r = track.release(t);
    const vm = ves.current!, tm = tx.current!, rm = rec.current!;
    for (let i = 0; i < NV; i++) {
      const home = v((hash2(i, 1) - 0.5) * 0.7 * R, (0.3 + 0.35 * hash2(i, 2)) * R, (hash2(i, 3) - 0.5) * 0.5 * R);
      const t0 = (i / NV) * 0.6;
      const k = Math.min(1, Math.max(0, (r - t0) / 0.25));
      const target = v(home.x * 0.8, PRE + 0.06 * R, home.z * 0.6);
      _p.copy(home).lerp(target, Math.min(1, k * 1.6));
      const sc = 0.07 * R * (k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4));
      _m.compose(_p, _q.identity(), _s.setScalar(sc + 0.003 * Math.sin(t * 3 + i) * R));
      vm.setMatrixAt(i, _m);
    }
    vm.instanceMatrix.needsUpdate = true;
    let docked = 0;
    for (let i = 0; i < NT; i++) {
      const vi = i % NV;
      const t0 = (vi / NV) * 0.6 + 0.15;
      const k = Math.min(1, Math.max(0, (r - t0) / 0.35));
      const x0 = (hash2(vi, 1) - 0.5) * 0.56 * R, z0 = (hash2(vi, 3) - 0.5) * 0.3 * R;
      const rx = recX[i % NR];
      // diffuse across the cleft with a little wobble, then dock
      const wob = (1 - k) * k * 0.15 * R;
      _p.set(x0 + (rx - x0) * k + wob * Math.sin(i * 3.1 + t * 4), PRE - (PRE - POST - 0.04 * R) * k, z0 * (1 - k) + wob * Math.cos(i * 2.3 + t * 3));
      if (k >= 1) docked++;
      _m.compose(_p, _q.identity(), _s.setScalar(k > 0 ? 0.022 * R : 0));
      tm.setMatrixAt(i, _m);
    }
    tm.instanceMatrix.needsUpdate = true;
    recX.forEach((x, i) => {
      _m.compose(_p.set(x, POST + 0.03 * R, 0), _q.identity(), _s.set(0.045 * R, 0.07 * R, 0.045 * R));
      rm.setMatrixAt(i, _m);
    });
    rm.instanceMatrix.needsUpdate = true;
    const d = docked / NT;
    mats.rec.emissiveIntensity = 0.1 + 2.5 * d;
    mats.post.emissiveIntensity = 0.2 + 2.2 * d * (0.8 + 0.2 * Math.sin(t * 8));
  });
  return (
    <>
      {/* presynaptic terminal (dome) and its membrane */}
      <mesh material={mats.pre} position={[0, PRE, 0]} renderOrder={31}>
        <sphereGeometry args={[0.6 * R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={mats.mem} position={[0, PRE, 0]} renderOrder={31}>
        <cylinderGeometry args={[0.6 * R, 0.6 * R, 0.035 * R, 48]} />
      </mesh>
      {/* postsynaptic dendrite */}
      <mesh material={mats.post} position={[0, POST - 0.03 * R, 0]} renderOrder={31}>
        <cylinderGeometry args={[0.66 * R, 0.66 * R, 0.06 * R, 48]} />
      </mesh>
      <instancedMesh ref={ves} args={[undefined, mats.ves, NV]} frustumCulled={false} renderOrder={32}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <instancedMesh ref={tx} args={[undefined, mats.tx, NT]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
      <instancedMesh ref={rec} args={[undefined, mats.rec, NR]} frustumCulled={false} renderOrder={32}>
        <cylinderGeometry args={[1, 0.7, 1, 12]} />
      </instancedMesh>
    </>
  );
}

/** section through the head: scalp, skull, dura (with pain fibres) above the brain tissue (none) */
function Layers({ R }: { R: number }) {
  const W = 1.1 * R, D = 0.6 * R;
  const fibres = useMemo(() => {
    const mk = (y0: number, y1: number, seed: number, n: number) => {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        let p = v((hash2(seed + i, 1) - 0.5) * W * 0.9, y0 + (y1 - y0) * 0.2, (hash2(seed + i, 2) - 0.5) * D * 0.8);
        const pts = [p.clone()];
        for (let k = 0; k < 6; k++) {
          p = p.clone().add(v((hash2(seed + i * 9 + k, 3) - 0.5) * 0.12 * R, ((y1 - y0) / 7) * (0.6 + hash2(seed + k, 4)), (hash2(seed + i * 9 + k, 5) - 0.5) * 0.08 * R));
          p.y = Math.min(y1, p.y);
          pts.push(p.clone());
        }
        parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.008 * R, 6, false));
      }
      return mergeGeometries(parts);
    };
    return { scalp: mk(0.44 * R, 0.68 * R, 10, 9), dura: mk(0.05 * R, 0.11 * R, 50, 7) };
  }, [R, W, D]);
  const mats = useMemo(() => ({
    skin: new THREE.MeshPhysicalMaterial({ color: '#e7ab95', roughness: 0.5, sheen: 0.5 }),
    bone: new THREE.MeshPhysicalMaterial({ color: '#efe4cc', roughness: 0.6 }),
    spongy: new THREE.MeshStandardMaterial({ color: '#d9a98a', roughness: 0.8 }),
    dura: new THREE.MeshPhysicalMaterial({ color: '#d9dde2', roughness: 0.4, clearcoat: 0.5 }),
    csf: new THREE.MeshPhysicalMaterial({ color: '#bfe6ff', roughness: 0.1, transparent: true, opacity: 0.5 }),
    cortex: new THREE.MeshPhysicalMaterial({ color: '#d79c9a', roughness: 0.45, sheen: 0.5 }),
    nerve: new THREE.MeshBasicMaterial({ color: '#ffd23a', toneMapped: false }),
  }), []);
  const nerves = useRef<THREE.Mesh[]>([]);
  useTimelineFrame((t) => {
    const p = track.pain(t);
    mats.nerve.color.setRGB(1, 0.82, 0.23).multiplyScalar(0.4 + (1.2 + 0.4 * Math.sin(t * 6)) * p);
  });
  const layer = (y0: number, y1: number, m: THREE.Material, key: string) => (
    <mesh key={key} material={m} position={[0, (y0 + y1) / 2, 0]} renderOrder={31}>
      <boxGeometry args={[W, y1 - y0, D]} />
    </mesh>
  );
  return (
    <>
      {layer(0.42 * R, 0.7 * R, mats.skin, 's')}
      {layer(0.34 * R, 0.42 * R, mats.bone, 'b1')}
      {layer(0.2 * R, 0.34 * R, mats.spongy, 'b2')}
      {layer(0.12 * R, 0.2 * R, mats.bone, 'b3')}
      {layer(0.04 * R, 0.12 * R, mats.dura, 'd')}
      {layer(-0.02 * R, 0.04 * R, mats.csf, 'c')}
      {layer(-0.72 * R, -0.02 * R, mats.cortex, 'x')}
      {/* fibres sit on the front face so they read in the section */}
      <mesh ref={(m) => { if (m) nerves.current[0] = m; }} geometry={fibres.scalp} material={mats.nerve} position={[0, 0, D / 2]} renderOrder={33} />
      <mesh ref={(m) => { if (m) nerves.current[1] = m; }} geometry={fibres.dura} material={mats.nerve} position={[0, 0, D / 2]} renderOrder={33} />
    </>
  );
}

export function Lenses() {
  return (
    <>
      <Lens center={LENS.syn} radius={LENS_R.syn} visible={track.lensSyn} tint="#ffd27a">
        <Synapse R={LENS_R.syn} />
      </Lens>
      <Lens center={LENS.skin} radius={LENS_R.skin} visible={track.lensSkin} tint="#ffd2b0">
        <Layers R={LENS_R.skin} />
      </Lens>
    </>
  );
}
