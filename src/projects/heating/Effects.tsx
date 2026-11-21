import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { COIL, PIPES, poly } from './House';
import { BURNER, FLOOR, LENS, LENS_R, RAD } from './script';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const HOT = new THREE.Color('#ff5a24');
const COLD = new THREE.Color('#3aa0ff');
/** hot → cold colour along a path */
const hotToCold = (a = 0.1, b = 0.9) => (_t: number, u: number, out: THREE.Color) => out.copy(HOT).lerp(COLD, Math.min(1, Math.max(0, (u - a) / (b - a))));
const coldToHot = (_t: number, u: number, out: THREE.Color) => out.copy(COLD).lerp(HOT, u);

/** series-standard magnifier: dark back sphere + fresnel shell, contents grow in */
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

/** blue burner flames: small tongues on the cylindrical burner surface */
function Flames() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 72;
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3f8cff', toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const light = useRef<THREE.PointLight>(null);
  useTimelineFrame((t) => {
    const f = track.flame(t);
    const mesh = ref.current!;
    for (let i = 0; i < N; i++) {
      const a = (i % 24) / 24 * Math.PI * 2 + (i >= 24 ? 0.13 : 0) + (i >= 48 ? 0.13 : 0);
      const y = BURNER[1] - 0.1 + Math.floor(i / 24) * 0.1;
      const flick = 0.75 + 0.25 * Math.sin(t * 23 + hash2(i, 1) * 20) * Math.sin(t * 17 + i);
      const len = 0.07 * f * flick;
      _p.set(BURNER[0] + Math.cos(a) * (0.09 + len / 2), y, BURNER[2] + Math.sin(a) * (0.09 + len / 2));
      _q.setFromUnitVectors(v(0, 1, 0), v(Math.cos(a), 0, Math.sin(a)));
      _m.compose(_p, _q, _s.set(0.016 * f, len, 0.016 * f));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (light.current) light.current.intensity = 2.5 * f * (0.9 + 0.1 * Math.sin(t * 19));
  });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, mat, N]} frustumCulled={false} renderOrder={22}>
        <coneGeometry args={[1, 1, 10, 1, false]} />
      </instancedMesh>
      <pointLight ref={light} position={BURNER} color="#ff8a3a" distance={1.6} decay={2} />
    </>
  );
}

/** condensate drips into the funnel (from the condensing scene on) */
function Drips() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 4;
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#dff0ff', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9 }), []);
  useTimelineFrame((t) => {
    const k = track.condense(t);
    const mesh = ref.current!;
    for (let i = 0; i < N; i++) {
      const u = (t * 0.9 + i / N) % 1;
      _m.compose(_p.set(-1.95, 0.53 - u * 0.0, -2.05).setY(0.6 - u * 0.12), _q.identity(), _s.setScalar(k > 0.01 ? 0.012 : 0));
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

/** magnifier at the bottom of the heat exchanger: vapour in the exhaust condenses on the cold return-water tube */
function Condensing({ R }: { R: number }) {
  const mol = useRef<THREE.InstancedMesh>(null);
  const gas = useRef<THREE.InstancedMesh>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const tubeMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const NM = 46, NG = 60, ND = 14;
  const TUBES = [0.22 * R, -0.34 * R];
  const TR = 0.15 * R;
  const mats = useMemo(() => ({ mol: new THREE.MeshPhysicalMaterial({ color: '#e9f5ff', roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.95 }), gas: new THREE.MeshBasicMaterial({ color: '#ff8a3a', toneMapped: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), drop: new THREE.MeshPhysicalMaterial({ color: '#d6ecff', roughness: 0.02, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85 }) }), []);
  useTimelineFrame((t) => {
    const k = track.condense(t);
    const mm = mol.current!, gm = gas.current!, dm = drops.current!;
    for (let i = 0; i < NG; i++) {
      const u = (i / NG + t * 0.45) % 1;
      const x = (hash2(i, 1) - 0.5) * 1.5 * R;
      _m.compose(_p.set(x + 0.04 * R * Math.sin(t * 3 + i), (0.85 - u * 1.7) * R, (hash2(i, 2) - 0.5) * 0.5 * R), _q.identity(), _s.set(0.012 * R, 0.045 * R, 0.012 * R));
      gm.setMatrixAt(i, _m);
    }
    gm.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NM; i++) {
      const u = (i / NM + t * 0.3) % 1;
      const x = (hash2(i, 3) - 0.5) * 1.3 * R;
      let y = (0.9 - u * 1.8) * R;
      // molecules that reach a cold tube condense there (more of them as the scene progresses)
      const captured = hash2(i, 4) < 0.25 + 0.7 * k;
      let sc = 0.045 * R;
      for (const ty of TUBES) {
        const top = ty + TR;
        if (captured && Math.abs(x) < 0.7 * R && y < top + 0.02 * R && y > ty - TR) {
          const sink = (top + 0.02 * R - y) / (0.12 * R);
          sc *= Math.max(0, 1 - sink);
          y = Math.max(y, top);
        }
      }
      const edge = Math.min(1, (1 - Math.abs(y / R)) / 0.12);
      _m.compose(_p.set(x, y, (hash2(i, 5) - 0.5) * 0.5 * R), _q.setFromEuler(_e.set(t + i, t * 0.7, 0)), _s.setScalar(Math.max(0, sc * edge)));
      mm.setMatrixAt(i, _m);
    }
    mm.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < ND; i++) {
      const ty = TUBES[i % 2];
      const x = (-0.6 + 1.2 * hash2(i, 6)) * R;
      const g = Math.min(1, Math.max(0, k * 1.6 - hash2(i, 7) * 0.6));
      // full drops fall off and are replaced
      const fall = g >= 1 && hash2(i, 8) < 0.5 ? ((t * 0.8 + hash2(i, 9)) % 1) : 0;
      const r = (0.035 + 0.035 * hash2(i, 10)) * R * g;
      _m.compose(_p.set(x, ty - TR - r * 0.6 - fall * 0.5 * R, 0.05 * R), _q.identity(), _s.set(r, r * (1.25 + fall), r));
      dm.setMatrixAt(i, _m);
    }
    dm.instanceMatrix.needsUpdate = true;
    // heat released into the tube when vapour condenses
    if (tubeMat.current) tubeMat.current.emissiveIntensity = 0.5 * k * (0.8 + 0.2 * Math.sin(t * 5));
  });
  return (
    <>
      {TUBES.map((y) => (
        <group key={y} position={[0, y, 0]} rotation-z={Math.PI / 2}>
          <mesh renderOrder={31}>
            <cylinderGeometry args={[TR, TR, 1.5 * R, 40, 1, true]} />
            <meshPhysicalMaterial ref={tubeMat} color="#aab4be" metalness={0.8} roughness={0.25} emissive="#ff7a2a" emissiveIntensity={0} side={THREE.DoubleSide} />
          </mesh>
          <mesh renderOrder={31}>
            <cylinderGeometry args={[TR * 0.82, TR * 0.82, 1.5 * R, 40]} />
            <meshPhysicalMaterial color="#2f7fd6" roughness={0.1} clearcoat={1} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={gas} args={[undefined, mats.gas, NG]} frustumCulled={false} renderOrder={32}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
      <instancedMesh ref={mol} args={[undefined, mats.mol, NM]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <instancedMesh ref={drops} args={[undefined, mats.drop, ND]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 20, 14]} />
      </instancedMesh>
    </>
  );
}

/**
 * Thermostatic valve section (vertical): wax capsule in the head expands with room temperature,
 * pushes the pin down, the plug closes the seat; hot water flows through the gap.
 */
function ValveSection({ R, expansion }: { R: number; expansion: (t: number) => number }) {
  const caps = useRef<THREE.Mesh>(null);
  const pin = useRef<THREE.Group>(null);
  const water = useRef<THREE.InstancedMesh>(null);
  const NW = 40;
  const path = useMemo(() => poly([v(-0.9 * R, -0.62 * R, 0), v(0, -0.62 * R, 0), v(0, -0.25 * R, 0), v(0.9 * R, -0.25 * R, 0)]), [R]);
  const bellows = useMemo(() => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 40; i++) pts.push(new THREE.Vector2(0.2 * R * (0.88 + 0.12 * Math.cos((i / 40) * Math.PI * 10)), -i / 40));
    pts.push(new THREE.Vector2(0, -1));
    return new THREE.LatheGeometry(pts, 40);
  }, [R]);
  const mats = useMemo(() => ({
    housing: new THREE.MeshPhysicalMaterial({ color: '#f1f1ee', roughness: 0.3, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    wax: new THREE.MeshPhysicalMaterial({ color: '#e8a23a', roughness: 0.25, clearcoat: 1, emissive: new THREE.Color('#5a2a00'), emissiveIntensity: 0.4 }),
    steel: new THREE.MeshPhysicalMaterial({ color: '#d8dde2', metalness: 1, roughness: 0.15 }),
    plug: new THREE.MeshPhysicalMaterial({ color: '#1e2226', roughness: 0.6 }),
    brass: new THREE.MeshPhysicalMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.25, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    seat: new THREE.MeshPhysicalMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.25 }),
    water: new THREE.MeshBasicMaterial({ color: '#ff6a2a', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  }), []);
  const SEAT = -0.42 * R;
  useTimelineFrame((t) => {
    const e = expansion(t);
    const L = 0.3 * R * (1 + 1.15 * e);
    if (caps.current) caps.current.scale.set(1, L, 1);
    const yb = 0.7 * R - L;
    const plugBottom = Math.max(SEAT + 0.03 * R, yb - 0.38 * R - 0.07 * R);
    if (pin.current) pin.current.position.y = plugBottom + 0.07 * R + 0.38 * R;
    const open = Math.min(1, Math.max(0, (plugBottom - SEAT - 0.03 * R) / (0.3 * R)));
    const wm = water.current!;
    for (let i = 0; i < NW; i++) {
      const u = (i / NW + t * 0.35) % 1;
      path.getPointAt(u, _p);
      _p.z += (hash2(i, 1) - 0.5) * 0.12 * R;
      _p.x += (hash2(i, 2) - 0.5) * 0.06 * R;
      const sc = 0.028 * R * Math.min(1, open * 3);
      _m.compose(_p, _q.identity(), _s.setScalar(sc));
      wm.setMatrixAt(i, _m);
    }
    wm.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      {/* head housing */}
      <mesh material={mats.housing} position={[0, 0.48 * R, 0]} renderOrder={31}>
        <cylinderGeometry args={[0.3 * R, 0.3 * R, 0.5 * R, 40, 1, true]} />
      </mesh>
      {/* wax capsule (bellows), fixed at the top, grows downwards */}
      <mesh ref={caps} geometry={bellows} material={mats.wax} position={[0, 0.7 * R, 0]} renderOrder={32} />
      {/* pin + plug (moved as one) */}
      <group ref={pin}>
        <mesh material={mats.steel} position={[0, -0.19 * R, 0]} renderOrder={32}>
          <cylinderGeometry args={[0.035 * R, 0.035 * R, 0.38 * R, 16]} />
        </mesh>
        <mesh material={mats.plug} position={[0, -0.38 * R - 0.035 * R, 0]} renderOrder={32}>
          <cylinderGeometry args={[0.15 * R, 0.15 * R, 0.07 * R, 32]} />
        </mesh>
      </group>
      {/* valve body: inlet, chamber, outlet; seat ring */}
      <mesh material={mats.brass} position={[-0.45 * R, -0.62 * R, 0]} rotation-z={Math.PI / 2} renderOrder={31}>
        <cylinderGeometry args={[0.12 * R, 0.12 * R, 0.9 * R, 32, 1, true]} />
      </mesh>
      <mesh material={mats.brass} position={[0, -0.42 * R, 0]} renderOrder={31}>
        <cylinderGeometry args={[0.2 * R, 0.2 * R, 0.5 * R, 32, 1, true]} />
      </mesh>
      <mesh material={mats.brass} position={[0.45 * R, -0.25 * R, 0]} rotation-z={Math.PI / 2} renderOrder={31}>
        <cylinderGeometry args={[0.12 * R, 0.12 * R, 0.9 * R, 32, 1, true]} />
      </mesh>
      <mesh material={mats.seat} position={[0, SEAT, 0]} rotation-x={Math.PI / 2} renderOrder={32}>
        <torusGeometry args={[0.14 * R, 0.03 * R, 12, 40]} />
      </mesh>
      <instancedMesh ref={water} args={[undefined, mats.water, NW]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
    </>
  );
}

export function Effects() {
  const fx = useMemo(() => {
    const xs = [1.2, 0.7, 0.2, -0.3, -0.75];
    const radFlow = xs.map((x) => poly([v(RAD.x1 - 0.02, RAD.y1 - 0.1, RAD.z), v(x, RAD.y1 - 0.1, RAD.z), v(x, RAD.y0 + 0.1, RAD.z), v(RAD.x0 + 0.02, RAD.y0 + 0.1, RAD.z)]));
    // convection rolls: up at the radiator, along the ceiling, down at the front, back along the floor
    const air = [-0.5, 0.3, 1.1].map((x, i) => new THREE.CatmullRomCurve3([v(x, FLOOR + 1.9, -2.15), v(x + 0.1, FLOOR + 3.6, -2.2), v(x, FLOOR + 4.7, -1.4), v(x - 0.1, FLOOR + 4.8, 0.6), v(x, FLOOR + 4.2, 1.9 - i * 0.1), v(x + 0.1, FLOOR + 2.0, 2.1), v(x, FLOOR + 0.5, 1.6), v(x - 0.1, FLOOR + 0.3, -0.2), v(x, FLOOR + 0.5, -1.8)], true, 'centripetal'));
    return { radFlow, air };
  }, []);
  const s3 = (t: number) => track.expansion(track.roomReveal(t), 20);
  const s5 = (t: number) => track.expansion(track.roomReveal(t), 28);
  const th = (t: number) => track.expansion(track.roomThermo(t), 20);
  const P = track.pipeXray;
  return (
    <group name="Effects">
      <Flames />
      <FlowParticles curve={COIL} intensity={(t) => track.pump(t) * P(t)} count={90} speed={0.5} size={0.022} color={coldToHot} glow={1.8} renderOrder={23} />
      <FlowParticles curve={PIPES.supply} intensity={(t) => track.pump(t) * P(t)} count={120} speed={1.0} size={0.026} stretch={2} color="#ff5a24" glow={1.8} renderOrder={23} />
      <FlowParticles curve={PIPES.ret} intensity={(t) => track.pump(t) * P(t)} count={110} speed={1.0} size={0.026} stretch={2} color="#3aa0ff" glow={1.8} renderOrder={23} />
      {fx.radFlow.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={(t) => track.radXray(t) * track.radHeat(t)} count={16} speed={0.35} size={0.024} color={hotToCold(0.3, 0.95)} glow={1.6} renderOrder={24} />
      ))}
      {fx.air.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={track.air} closed count={120} speed={0.55} size={0.026} stretch={2.6} spread={0.16} color={(_t, u, out) => out.copy(HOT).lerp(COLD, Math.min(1, Math.max(0, (u - 0.2) / 0.45)) * (u < 0.92 ? 1 : 1 - (u - 0.92) / 0.08))} glow={0.9} />
      ))}
      <Drips />
      <Lens center={LENS.cond} radius={LENS_R.cond} visible={track.lensCond} tint="#bfe6ff">
        <Condensing R={LENS_R.cond} />
      </Lens>
      <Lens center={LENS.thermo} radius={LENS_R.thermo} visible={track.lensThermo} tint="#ffd2a0">
        <ValveSection R={LENS_R.thermo} expansion={th} />
      </Lens>
      <Lens center={LENS.s3} radius={LENS_R.cmp} visible={track.lensCmp} tint="#ffd2a0">
        <ValveSection R={LENS_R.cmp} expansion={s3} />
      </Lens>
      <Lens center={LENS.s5} radius={LENS_R.cmp} visible={track.lensCmp} tint="#ffd2a0">
        <ValveSection R={LENS_R.cmp} expansion={s5} />
      </Lens>
    </group>
  );
}
