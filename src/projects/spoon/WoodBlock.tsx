import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { BLOCK, BW, createBlockMaterial, type WoodUniforms } from './wood';
import * as track from './script';

const YH = -BW.y / 2 + 0.18; // hinge line of the crack (crack depth = BW.y − 0.18)
const TOP = BW.y / 2;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const hide = (m: THREE.InstancedMesh, i: number) => m.setMatrixAt(i, _m.makeScale(0, 0, 0));

/** half-width of the V crack at height y for opening angle a */
const gapAt = (y: number, a: number) => Math.max(0, (y - YH) * Math.tan(a));

export const woodU: WoodUniforms = { uWet: { value: 0 }, uFat: { value: 0 }, uSauce: { value: 0 }, uDry: { value: 0 } };

export function WoodBlock() {
  const group = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const half = (sign: number) => {
      const g = new THREE.BoxGeometry(BW.x, BW.y, BW.z / 2, 40, 20, 16);
      g.translate(0, -YH, (sign * BW.z) / 4);
      return g;
    };
    return { front: half(1), back: half(-1) };
  }, []);
  const mat = useMemo(() => createBlockMaterial(woodU), []);
  const resRef = useRef<THREE.InstancedMesh>(null);
  const bugRef = useRef<THREE.InstancedMesh>(null);
  const surfRef = useRef<THREE.InstancedMesh>(null);
  const NR = 150;
  const NBUG = 90;
  const NS = 40;
  const resMat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.9 }), []);
  const bugMat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.7 }), []);
  const cols = useMemo(() => ({ sauce: new THREE.Color('#9e1f12'), juice: new THREE.Color('#5a3018'), fat: new THREE.Color('#e8c35a'), bugs: ['#6fae5a', '#8f7cc4', '#c98a4a'].map((c) => new THREE.Color(c)), dead: new THREE.Color('#6b6660') }), []);

  useTimelineFrame((t) => {
    const v = track.block(t);
    if (group.current) {
      group.current.visible = v > 0.002;
      const s = track.swell(t);
      group.current.scale.set(1, 1 + s, 1 + s * 1.3);
    }
    mat.opacity = v;
    mat.depthWrite = v > 0.5;
    woodU.uWet.value = track.wet(t);
    woodU.uFat.value = track.fat(t);
    woodU.uSauce.value = track.sauce(t);
    woodU.uDry.value = track.dry(t);
    const a = track.crack(t);
    if (front.current) front.current.rotation.x = a;
    if (back.current) back.current.rotation.x = -a;
    // food residues pressed into the crack
    const res = resRef.current!;
    const fill = track.sauce(t);
    for (let i = 0; i < NR; i++) {
      const appear = (i / NR) * 0.85;
      const k = Math.min(1, Math.max(0, (fill - appear) / 0.15));
      if (k <= 0 || v < 0.01) {
        hide(res, i);
        continue;
      }
      const depth = 0.03 + hash2(i, 2) * (TOP - YH) * 0.8;
      const y = TOP - depth + (1 - k) * 0.25;
      const hw = gapAt(Math.min(y, TOP), a);
      const z = (hash2(i, 3) - 0.5) * 1.4 * hw;
      const x = hash2(i, 8) < 0.3 ? BW.x / 2 - 0.12 * hash2(i, 1) : (hash2(i, 1) - 0.5) * BW.x * 0.94;
      const r = Math.max(0.004, Math.min(0.011, hw * (0.5 + 0.4 * hash2(i, 4)))) * k;
      _m.compose(_p.set(x, y, z), _q.identity(), _s.set(r, r * 0.8, r));
      res.setMatrixAt(i, _m);
      const kind = hash2(i, 5);
      res.setColorAt(i, _c.copy(kind < 0.45 ? cols.sauce : kind < 0.75 ? cols.juice : cols.fat));
    }
    res.instanceMatrix.needsUpdate = true;
    if (res.instanceColor) res.instanceColor.needsUpdate = true;
    // bacteria colonising the moist crack
    const bugs = bugRef.current!;
    const bv = track.bacteria(t);
    for (let i = 0; i < NBUG; i++) {
      const g = Math.min(1, Math.max(0, bv * 1.5 - hash2(i, 1) * 0.5));
      if (g <= 0 || v < 0.01) {
        hide(bugs, i);
        continue;
      }
      const depth = 0.04 + hash2(i, 2) * (TOP - YH) * 0.8;
      const y = TOP - depth;
      const hw = gapAt(y, a);
      _q.setFromEuler(new THREE.Euler(hash2(i, 3) * 3, hash2(i, 4) * 3, hash2(i, 5) * 3 + 0.2 * Math.sin(t * 2 + i)));
      const s = 0.0065 * g;
      _m.compose(_p.set(hash2(i, 8) < 0.5 ? BW.x / 2 - 0.1 * hash2(i, 6) : (hash2(i, 6) - 0.5) * BW.x * 0.9, y, (hash2(i, 7) - 0.5) * 1.6 * hw), _q, _s.set(s, s * 2.2, s));
      bugs.setMatrixAt(i, _m);
      bugs.setColorAt(i, _c.copy(cols.bugs[i % 3]));
    }
    bugs.instanceMatrix.needsUpdate = true;
    if (bugs.instanceColor) bugs.instanceColor.needsUpdate = true;
    // surprise: bacteria on intact wood are drawn into the pores, then die as it dries
    const sf = surfRef.current!;
    const sv = track.surfaceBugs(t);
    const din = track.drawIn(t);
    const dry = track.dry(t);
    for (let i = 0; i < NS; i++) {
      if (sv <= 0.002) {
        hide(sf, i);
        continue;
      }
      const x = 0.05 + hash2(i, 1) * 0.58;
      const z = -0.06 - hash2(i, 2) * 0.36;
      const sink = din * (0.04 + 0.06 * hash2(i, 3));
      _q.setFromEuler(new THREE.Euler(Math.PI / 2, hash2(i, 4) * 3, 0));
      const s = 0.0065 * sv * (1 - 0.6 * dry) * (1 - 0.5 * din);
      _m.compose(_p.set(x, TOP + 0.008 - sink, z), _q, _s.set(s, s * 2.2, s));
      sf.setMatrixAt(i, _m);
      sf.setColorAt(i, _c.copy(cols.bugs[i % 3]).lerp(cols.dead, dry));
    }
    sf.instanceMatrix.needsUpdate = true;
    if (sf.instanceColor) sf.instanceColor.needsUpdate = true;
  });

  const rinse = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(-0.7, TOP + 0.03, 0.05), new THREE.Vector3(0, TOP + 0.012, 0.0), new THREE.Vector3(0.7, TOP + 0.03, -0.05)]), []);
  const sprays = useMemo(
    () => [-0.45, -0.15, 0.15, 0.45].map((x) => new THREE.CatmullRomCurve3([new THREE.Vector3(x - 0.2, TOP + 1.4, 0.3), new THREE.Vector3(x - 0.05, TOP + 0.6, 0.1), new THREE.Vector3(x, TOP, 0.0)])),
    [],
  );
  return (
    <group ref={group} position={BLOCK} name="WoodBlock">
      <group ref={front} position={[0, YH, 0]}>
        <mesh geometry={geo.front} material={mat} castShadow receiveShadow />
      </group>
      <group ref={back} position={[0, YH, 0]}>
        <mesh geometry={geo.back} material={mat} castShadow receiveShadow />
      </group>
      <instancedMesh ref={resRef} args={[undefined, resMat, NR]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <instancedMesh ref={bugRef} args={[undefined, bugMat, NBUG]} frustumCulled={false}>
        <capsuleGeometry args={[1, 1.4, 4, 8]} />
      </instancedMesh>
      <instancedMesh ref={surfRef} args={[undefined, bugMat, NS]} frustumCulled={false}>
        <capsuleGeometry args={[1, 1.4, 4, 8]} />
      </instancedMesh>
      <FlowParticles curve={rinse} intensity={track.rinse} count={70} speed={0.9} size={0.012} stretch={2} color="#8fd0ff" glow={1.6} spread={0.05} />
      {sprays.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={track.spray} count={24} speed={2.2} size={0.012} stretch={3} color="#bfe6ff" glow={1.4} spread={0.06} />
      ))}
    </group>
  );
}

/** magnifier: wood vessels as open tubes; water and then fat creep in by capillarity */
export function Vessels({ center, radius }: { center: readonly [number, number, number]; radius: number }) {
  const R = radius;
  const group = useRef<THREE.Group>(null);
  const tubes = useMemo(() => {
    const out: THREE.Vector2[] = [];
    for (let q = -2; q <= 2; q++)
      for (let r = -2; r <= 2; r++) {
        const x = (q + r * 0.5) * 0.24;
        const y = r * 0.21;
        if (Math.hypot(x, y) < 0.62) out.push(new THREE.Vector2(x * R, y * R));
      }
    return out;
  }, [R]);
  const mats = useMemo(() => {
    const shell = createXRayMaterial('#ffd8a0', []);
    const back = new THREE.MeshPhysicalMaterial({ color: '#160e08', roughness: 0.3, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.BackSide });
    const wall = new THREE.MeshPhysicalMaterial({ color: '#d7a46a', roughness: 0.6, side: THREE.DoubleSide, transparent: true });
    const water = new THREE.MeshPhysicalMaterial({ color: '#4f9fd8', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8 });
    const oil = new THREE.MeshPhysicalMaterial({ color: '#e8c04a', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 });
    return { shell, back, wall, water, oil };
  }, []);
  const L = 0.85 * R;
  const wRef = useRef<THREE.InstancedMesh>(null);
  const oRef = useRef<THREE.InstancedMesh>(null);
  useTimelineFrame((t) => {
    const v = track.magV(t);
    if (group.current) {
      group.current.visible = v > 0.002;
      group.current.scale.setScalar(0.6 + 0.4 * v);
    }
    mats.shell.uniforms.uOpacity.value = v;
    mats.back.opacity = 0.75 * v;
    mats.wall.opacity = v;
    mats.water.opacity = 0.8 * v;
    mats.oil.opacity = 0.85 * v;
    const wf = Math.min(1, Math.max(0, (t - 10.6) / 1.8));
    const of = Math.min(1, Math.max(0, (t - 12.3) / 1.6)) * 0.45;
    tubes.forEach((p, i) => {
      const jitter = 0.85 + 0.3 * hash2(i, 1);
      const lw = Math.min(1, wf * jitter) * (1 - of);
      const lo = of * jitter;
      // liquids enter from the back (−z) and advance towards the viewer
      const zw0 = -L / 2;
      _m.compose(_p.set(p.x, p.y, zw0 + (lw * L) / 2), _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), _s.set(1, Math.max(0.0001, lw * L), 1));
      wRef.current!.setMatrixAt(i, _m);
      _m.compose(_p.set(p.x, p.y, zw0 + lw * L + (lo * L) / 2), _q, _s.set(1, Math.max(0.0001, lo * L), 1));
      oRef.current!.setMatrixAt(i, _m);
    });
    wRef.current!.instanceMatrix.needsUpdate = true;
    oRef.current!.instanceMatrix.needsUpdate = true;
  });
  const wallGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.1 * R, 0.1 * R, L, 24, 1, true);
    g.rotateX(Math.PI / 2);
    return g;
  }, [R, L]);
  const liqGeo = useMemo(() => new THREE.CylinderGeometry(0.085 * R, 0.085 * R, 1, 20, 1), [R]);
  return (
    <group ref={group} position={center as [number, number, number]} name="VesselMagnifier">
      <mesh material={mats.back} renderOrder={30}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
      {tubes.map((p, i) => (
        <mesh key={i} geometry={wallGeo} material={mats.wall} position={[p.x, p.y, 0]} renderOrder={31} />
      ))}
      <instancedMesh ref={wRef} args={[liqGeo, mats.water, tubes.length]} frustumCulled={false} renderOrder={32} />
      <instancedMesh ref={oRef} args={[liqGeo, mats.oil, tubes.length]} frustumCulled={false} renderOrder={32} />
      <mesh material={mats.shell} renderOrder={35}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
    </group>
  );
}
