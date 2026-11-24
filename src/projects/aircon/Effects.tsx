import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { COIL_IN, LOOP } from './Units';
import { FAN_IN, FAN_OUT, IN, LENS, LENS_R, OUT, PRESS } from './script';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const HOT = new THREE.Color('#ff4a1c');
const WARM = new THREE.Color('#ffa040');
const COLD = new THREE.Color('#3a9cff');
const COOL = new THREE.Color('#8fe6ff');

/** refrigerant colour along the loop: cold liquid → evaporating → cool gas → hot gas → condensing → warm liquid → (valve) cold */
const loopColor = (_t: number, u: number, out: THREE.Color) => {
  const { uInStart: a, uInEnd: b, uComp: c, uCondStart: d, uCondEnd: e } = LOOP;
  if (u < a) return out.copy(COLD);
  if (u < b) return out.copy(COLD).lerp(COOL, (u - a) / (b - a));
  if (u < c) return out.copy(COOL);
  if (u < d) return out.copy(COOL).lerp(HOT, (u - c) / (d - c));
  if (u < e) return out.copy(HOT).lerp(WARM, (u - d) / (e - d));
  return out.copy(WARM).lerp(COLD, Math.min(1, (u - e) / 0.01));
};

/** series-standard magnifier */
function Lens({ center, radius, visible, tint = '#9fe0ff', children }: { center: readonly number[]; radius: number; visible: (t: number) => number; tint?: string; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const mats = useMemo(() => ({ shell: createXRayMaterial(tint, []), back: new THREE.MeshPhysicalMaterial({ color: '#0c1218', roughness: 0.3, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.BackSide }) }), [tint]);
  useTimelineFrame((t) => {
    const k = visible(t);
    if (!g.current) return;
    g.current.visible = k > 0.002;
    g.current.scale.setScalar(0.05 + 0.95 * k);
    mats.shell.uniforms.uOpacity.value = k;
    mats.back.opacity = 0.85 * k;
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

/** evaporation in a coil tube: liquid droplets (blue) take up heat (red dots from the air) and become gas bubbles */
function Evaporation({ R }: { R: number }) {
  const liq = useRef<THREE.InstancedMesh>(null);
  const heat = useRef<THREE.InstancedMesh>(null);
  const NL = 60, NH = 40;
  const TR = 0.28 * R;
  const mats = useMemo(() => ({
    tube: new THREE.MeshPhysicalMaterial({ color: '#c27a4a', metalness: 0.9, roughness: 0.3, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
    liq: new THREE.MeshPhysicalMaterial({ roughness: 0.1, clearcoat: 1, transparent: true }),
    heat: new THREE.MeshBasicMaterial({ color: '#ff5a24', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  }), []);
  const _c = useMemo(() => new THREE.Color(), []);
  useTimelineFrame((t) => {
    const k = track.evap(t);
    const lm = liq.current!, hm = heat.current!;
    for (let i = 0; i < NL; i++) {
      const u = (i / NL + t * 0.12) % 1;
      const x = (-0.95 + 1.9 * u) * R;
      // along the tube the liquid turns into gas: droplets swell into faint bubbles
      const g = Math.min(1, Math.max(0, (u - 0.25 + 0.2 * hash2(i, 3)) / 0.45)) * k;
      const r = (0.05 + 0.06 * g) * R;
      _p.set(x, (hash2(i, 1) - 0.5) * (TR - r) * 1.6, (hash2(i, 2) - 0.5) * (TR - r) * 1.6);
      const edge = Math.min(1, (0.95 * R - Math.abs(x)) / (0.15 * R));
      _m.compose(_p, _q.identity(), _s.setScalar(Math.max(0, r * edge)));
      lm.setMatrixAt(i, _m);
      lm.setColorAt(i, _c.set('#2f8cff').lerp(new THREE.Color('#e6f6ff'), g));
    }
    lm.instanceMatrix.needsUpdate = true;
    if (lm.instanceColor) lm.instanceColor.needsUpdate = true;
    for (let i = 0; i < NH; i++) {
      const u = (i / NH + t * 0.5) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      const x = (hash2(i, 4) - 0.5) * 1.4 * R;
      const y = side * (0.85 - 0.6 * u) * R;
      const sc = 0.03 * R * (1 - Math.max(0, (u - 0.8) / 0.2)) * (0.3 + 0.7 * k);
      _m.compose(_p.set(x, y, (hash2(i, 5) - 0.5) * 0.4 * R), _q.identity(), _s.setScalar(sc));
      hm.setMatrixAt(i, _m);
    }
    hm.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <mesh material={mats.tube} rotation-z={Math.PI / 2} renderOrder={31}>
        <cylinderGeometry args={[TR, TR, 1.9 * R, 40, 1, true]} />
      </mesh>
      <instancedMesh ref={liq} args={[undefined, mats.liq, NL]} frustumCulled={false} renderOrder={32}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <instancedMesh ref={heat} args={[undefined, mats.heat, NH]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
    </>
  );
}

/** expansion valve: dense warm liquid squeezed through a narrow orifice, sprays out as a cold mist, frost forms */
function Expansion({ R }: { R: number }) {
  const parts = useRef<THREE.InstancedMesh>(null);
  const frost = useRef<THREE.InstancedMesh>(null);
  const NP = 90, NF = 40;
  const prof = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -0.95 + 1.9 * (i / 40);
      const r = 0.24 - 0.17 * Math.exp(-Math.pow((x + 0.05) / 0.08, 2));
      pts.push(new THREE.Vector2(r * R, x * R));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, [R]);
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.25, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    p: new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false }),
    frost: new THREE.MeshPhysicalMaterial({ color: '#f4fbff', roughness: 0.6, transparent: true, opacity: 0.9 }),
  }), []);
  const _c = useMemo(() => new THREE.Color(), []);
  useTimelineFrame((t) => {
    const k = Math.min(1, Math.max(0, (track.valveTemp(40) - track.valveTemp(t)) / 35));
    const pm = parts.current!, fm = frost.current!;
    for (let i = 0; i < NP; i++) {
      const before = i < NP / 2;
      const j = before ? i : i - NP / 2;
      const n = NP / 2;
      let x: number, r: number, sc: number;
      if (before) {
        // dense, slow liquid
        const u = (j / n + t * 0.25) % 1;
        x = -0.95 + 0.88 * u;
        r = 0.18 * Math.sqrt(hash2(i, 1));
        sc = 0.05;
        _c.copy(WARM);
      } else {
        // after the orifice: fast, spread out, cold
        const u = (j / n + t * 0.9) % 1;
        x = -0.05 + 0.95 * u;
        r = Math.min(0.2, 0.02 + 0.3 * u) * Math.sqrt(hash2(i, 1));
        sc = 0.03;
        _c.copy(WARM).lerp(COLD, Math.min(1, u * 3) * (0.3 + 0.7 * k));
      }
      const a = hash2(i, 2) * Math.PI * 2;
      _p.set(x * R, Math.cos(a) * r * R, Math.sin(a) * r * R);
      const edge = Math.min(1, (0.95 - Math.abs(x)) / 0.12);
      _m.compose(_p, _q.identity(), _s.setScalar(sc * R * edge));
      pm.setMatrixAt(i, _m);
      pm.setColorAt(i, _c.multiplyScalar(1.6));
    }
    pm.instanceMatrix.needsUpdate = true;
    if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
    for (let i = 0; i < NF; i++) {
      const x = 0.1 + 0.8 * hash2(i, 5);
      const a = hash2(i, 6) * Math.PI * 2;
      const g = Math.min(1, Math.max(0, k * 1.5 - hash2(i, 7) * 0.5));
      _p.set(x * R, Math.cos(a) * 0.245 * R, Math.sin(a) * 0.245 * R);
      _m.compose(_p, _q.identity(), _s.setScalar(0.035 * R * g));
      fm.setMatrixAt(i, _m);
    }
    fm.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <mesh geometry={prof} material={mats.body} rotation-z={-Math.PI / 2} renderOrder={31} />
      <instancedMesh ref={parts} args={[undefined, mats.p, NP]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <instancedMesh ref={frost} args={[undefined, mats.frost, NF]} frustumCulled={false} renderOrder={32}>
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </>
  );
}

/** condensate: droplets on the front fins, running down into the tray; drips at the hose end outside */
function Condensate() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 50;
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#cfeaff', roughness: 0.03, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85 }), []);
  useTimelineFrame((t) => {
    const w = track.wetFins(t);
    const mesh = ref.current!;
    for (let i = 0; i < N; i++) {
      if (i < 40) {
        // on the front face of the fin pack (slanted line from (−0.58,3.98) to (−0.45,4.46))
        const s = hash2(i, 1);
        const run = w >= 1 && hash2(i, 2) < 0.35 ? (t * 0.35 + hash2(i, 3)) % 1 : 0;
        const ss = Math.max(0, s - run);
        const x = -0.58 + 0.13 * ss - 0.03, y = 3.98 + 0.48 * ss;
        const r = (0.008 + 0.008 * hash2(i, 4)) * Math.min(1, Math.max(0, w * 1.4 - hash2(i, 5) * 0.4));
        _m.compose(_p.set(x, y, IN.z0 + 0.1 + (IN.z1 - IN.z0 - 0.2) * hash2(i, 6)), _q.identity(), _s.set(r, r * 1.3, r));
      } else {
        // hose outlet outside
        const u = (t * 0.8 + (i - 40) / 10) % 1;
        const r = 0.014 * track.drain(t);
        _m.compose(_p.set(0.34, 0.27 - u * 0.25, 0.3), _q.identity(), _s.set(r, r * 1.4, r));
      }
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, mat, N]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
    </instancedMesh>
  );
}

/** moisture in the print shop: mist drifting towards the old cooler and vanishing as the humidity drops */
function Mist() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 70;
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9fd4ff', toneMapped: false, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useTimelineFrame((t) => {
    const k = track.press(t) * Math.min(1, Math.max(0, (track.humidity(t) - 42) / 43));
    const mesh = ref.current!;
    for (let i = 0; i < N; i++) {
      const u = (i / N + t * 0.08) % 1;
      const x = PRESS[0] + (hash2(i, 1) - 0.5) * 2.2 - u * 0.6;
      const y = 0.3 + hash2(i, 2) * 1.6 + 0.08 * Math.sin(t + i);
      const z = PRESS[2] + (hash2(i, 3) - 0.5) * 1.4 - u * 0.5;
      _m.compose(_p.set(x, y, z), _q.identity(), _s.setScalar(0.03 * k));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, mat, N]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
    </instancedMesh>
  );
}

export function Effects() {
  const fx = useMemo(() => {
    // room air: drawn in at the top of the indoor unit, through the coil and fan, blown out cold at the bottom
    const inAir = [-0.6, 0, 0.6].map((z) => new THREE.CatmullRomCurve3([v(-3.2, 2.6, z + 0.4), v(-1.6, 4.4, z + 0.2), v(-0.5, 4.75, z), v(-0.4, 4.4, z), v(FAN_IN[0], FAN_IN[1], z), v(-0.62, 3.88, z), v(-1.4, 3.3, z + 0.1), v(-2.8, 2.0, z + 0.3), v(-3.4, 0.8, z + 0.4)]));
    // outside air: through the condenser at the back, out of the fan at the front (hot)
    const outAir = [-0.25, 0, 0.25].map((d) => new THREE.CatmullRomCurve3([v(FAN_OUT[0] + d * 2, FAN_OUT[1] + d, -1.2), v(FAN_OUT[0] + d, FAN_OUT[1] + d * 0.5, OUT.z0 - 0.05), v(FAN_OUT[0], FAN_OUT[1], OUT.z1), v(FAN_OUT[0] + d * 1.5, FAN_OUT[1] + 0.2 + d, 1.0), v(FAN_OUT[0] + d * 3, FAN_OUT[1] + 0.8 + d, 2.0)]));
    return { inAir, outAir };
  }, []);
  void COIL_IN;
  return (
    <group name="Effects">
      <FlowParticles curve={LOOP.curve} intensity={track.pipeXray} closed count={420} speed={0.7} size={0.02} stretch={2} color={loopColor} glow={1.8} renderOrder={23} />
      {fx.inAir.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={(t) => 1 - 0.85 * track.inClose(t)} count={46} speed={0.6} size={0.02} stretch={2.2} spread={0.12} color={(_t, u, out) => out.copy(HOT).lerp(COLD, Math.min(1, Math.max(0, (u - 0.42) / 0.12)))} glow={1.1} />
      ))}
      {fx.outAir.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={(t) => 1 - track.outClose(t)} count={40} speed={0.8} size={0.02} stretch={2.2} spread={0.15} color={(_t, u, out) => out.copy(WARM).lerp(HOT, Math.min(1, Math.max(0, (u - 0.25) / 0.2)))} glow={1.1} />
      ))}
      <Condensate />
      <Mist />
      <Lens center={LENS.evap} radius={LENS_R.evap} visible={track.lensEvap} tint="#bfe6ff">
        <Evaporation R={LENS_R.evap} />
      </Lens>
      <Lens center={LENS.valve} radius={LENS_R.valve} visible={track.lensValve} tint="#ffd2a0">
        <Expansion R={LENS_R.valve} />
      </Lens>
    </group>
  );
}
