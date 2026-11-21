import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { Steam } from '../../engine/effects/Steam';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { PIPES, TUB } from './Machine';
import { HUB_LOW, HUB_UP, SUMP } from './script';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** nozzles on an arm: offsets along the arm (x) and tilt — the tangential component drives the rotation */
const NOZ = [-1.6, -1.15, -0.7, 0.7, 1.15, 1.6];

/** jets from both spray arms (rotate with the arm), streaks of water */
function Jets() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const K = 26;
  const N = NOZ.length * 2;
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e3f4ff', roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 2 }), []);
  useTimelineFrame((t) => {
    const mesh = ref.current!;
    const pw = track.pump(t);
    const a = track.armAngleFast(t);
    for (let arm = 0; arm < 2; arm++) {
      const hub = arm === 0 ? HUB_LOW : HUB_UP;
      const ang = arm === 0 ? a : -a * 1.15;
      const scale = arm === 0 ? 1 : 0.82;
      for (let n = 0; n < NOZ.length; n++) {
        const off = NOZ[n] * scale;
        // nozzle position on the rotating arm
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const nx = hub[0] + off * ca, nz = hub[2] - off * sa;
        // jet: mostly up (lower arm) / up+down (upper arm), tilted backwards along the rotation
        const tang = new THREE.Vector3(sa, 0, ca).multiplyScalar(off > 0 ? 1 : -1);
        for (let k = 0; k < K; k++) {
          const id = (arm * NOZ.length + n) * K + k;
          const u = (k / K + t * 2.4 + hash2(n + arm * 9, 3)) % 1;
          const dirUp = arm === 0 || k % 2 === 0 ? 1 : -1;
          _d.set(0, dirUp, 0).addScaledVector(tang, -0.35).normalize();
          // the jet leaves the moving nozzle: older droplets lag behind the arm (spiral fan)
          const lag = u * 0.5 * pw;
          const cl = Math.cos(ang - lag * Math.sign(off)), sl = Math.sin(ang - lag * Math.sign(off));
          _p.set(hub[0] + off * cl, hub[1], hub[2] - off * sl).addScaledVector(_d, u * (arm === 0 ? 2.3 : 1.6));
          const sc = 0.018 * pw * (1 - Math.max(0, (u - 0.8) / 0.2));
          _q.setFromUnitVectors(UP, _d);
          _m.compose(_p, _q, _s.set(sc, sc * 8, sc));
          mesh.setMatrixAt(id, _m);
          void nx;
          void nz;
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, mat, N * K]} frustumCulled={false} renderOrder={9}>
      <sphereGeometry args={[1, 8, 6]} />
    </instancedMesh>
  );
}

/** recoil: jet arrow (blue, backwards) and reaction force arrow (orange, forwards) at both ends of the lower arm */
function RecoilArrows() {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => ({ jet: new THREE.MeshBasicMaterial({ color: '#5ab8ff', toneMapped: false, transparent: true }), force: new THREE.MeshBasicMaterial({ color: '#ffb04a', toneMapped: false, transparent: true }) }), []);
  const Arrow = ({ mat, len }: { mat: THREE.Material; len: number }) => (
    <group>
      <mesh material={mat} position={[0, len / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, len, 12]} />
      </mesh>
      <mesh material={mat} position={[0, len + 0.06, 0]}>
        <coneGeometry args={[0.07, 0.14, 16]} />
      </mesh>
    </group>
  );
  useTimelineFrame((t) => {
    const g = group.current;
    if (!g) return;
    const v = track.arrows(t);
    g.visible = v > 0.002;
    mats.jet.opacity = v;
    mats.force.opacity = v;
    g.rotation.y = track.armAngleFast(t);
  });
  return (
    <group ref={group} position={HUB_LOW}>
      {[1, -1].map((s) => (
        <group key={s} position={[1.6 * s, 0.05, 0]}>
          {/* jet: up and backwards (−tangent) */}
          <group rotation={[s * 0.55, 0, 0]}>
            <Arrow mat={mats.jet} len={0.7} />
          </group>
          {/* reaction: forwards along the tangent */}
          <group rotation={[s * -Math.PI / 2, 0, 0]}>
            <Arrow mat={mats.force} len={0.6} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** steam rising and condensing on the cooler side walls during drying */
function Condensation() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 160;
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', roughness: 0.03, metalness: 0.3, clearcoat: 1, transparent: true, opacity: 0.7 }), []);
  useTimelineFrame((t) => {
    const mesh = ref.current!;
    const c = track.condense(t);
    for (let i = 0; i < N; i++) {
      const side = i % 2 === 0 ? TUB.x0 + 0.02 : TUB.x1 - 0.02;
      const y0 = TUB.y0 + 0.4 + hash2(i, 1) * (TUB.y1 - TUB.y0 - 0.8);
      const z = TUB.z0 + 0.2 + hash2(i, 2) * (TUB.z1 - TUB.z0 - 0.4);
      const grow = Math.min(1, Math.max(0, c * 1.5 - hash2(i, 3) * 0.5));
      // big droplets run down the wall
      const run = grow > 0.8 && hash2(i, 4) < 0.3 ? (t * 0.4 + hash2(i, 5)) % 1 : 0;
      const s = (0.02 + 0.03 * hash2(i, 6)) * grow;
      _m.compose(_p.set(side, y0 - run * 1.5, z), _q.identity(), _s.set(s * 0.5, s * (1 + run), s));
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

/** final comparison: water used by the machine vs. washing up by hand (same load) */
function Compare() {
  const g = useRef<THREE.Group>(null);
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => ({ glass: new THREE.MeshPhysicalMaterial({ color: '#dff0ff', roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), water: new THREE.MeshPhysicalMaterial({ color: '#3f8fd6', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 }) }), []);
  useTimelineFrame((t) => {
    const v = track.compare(t);
    if (g.current) g.current.visible = v > 0.002;
    const fill = Math.min(1, Math.max(0, (t - track.T.compare[0] - 0.4) / 1.6));
    if (a.current) a.current.scale.set(1, Math.max(0.001, fill * 0.25), 1);
    if (b.current) b.current.scale.set(1, Math.max(0.001, fill), 1);
    mats.glass.opacity = 0.18 * v;
    mats.water.opacity = 0.85 * v;
  });
  const H = 5.2;
  return (
    <group ref={g} position={[0, 0, 3.4]}>
      {[-1.3, 1.3].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={mats.glass} position={[0, H / 2, 0]}>
            <cylinderGeometry args={[0.55, 0.55, H, 40, 1, true]} />
          </mesh>
          <mesh ref={i === 0 ? a : b} material={mats.water} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, H, 40]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Water() {
  const fx = useMemo(
    () => ({
      // dirt carried to the sump and caught by the filter
      dirt: [0, 1, 2, 3].map((i) => new THREE.CatmullRomCurve3([new THREE.Vector3(-1.4 + i * 0.9, 1.9, -0.9 + (i % 2) * 1.8), new THREE.Vector3(-0.8 + i * 0.5, 1.0, -0.4 + (i % 2) * 0.8), new THREE.Vector3(SUMP[0] + 0.1 * (i - 1.5), 0.75, SUMP[2]), new THREE.Vector3(SUMP[0] + 0.15 * (i - 1.5), 0.6, SUMP[2] + 0.1)])),
    }),
    [],
  );
  return (
    <group name="Water">
      <FlowParticles curve={PIPES.inlet} intensity={track.inflow} count={40} speed={1.6} size={0.03} stretch={2} color="#6fc0ff" glow={1.8} spread={0.03} />
      <FlowParticles curve={PIPES.softToSump} intensity={track.inflow} count={40} speed={1.6} size={0.03} stretch={2} color="#6fc0ff" glow={1.8} spread={0.03} />
      <FlowParticles curve={PIPES.sumpToPump} intensity={track.pump} count={30} speed={2.4} size={0.03} stretch={2} color={'#7fd0ff'} glow={1.8} spread={0.03} />
      <FlowParticles curve={PIPES.toLower} intensity={track.pump} count={40} speed={2.8} size={0.03} stretch={2.2} color="#7fd0ff" glow={1.8} spread={0.03} />
      <FlowParticles curve={PIPES.toUpper} intensity={track.pump} count={110} speed={2.8} size={0.03} stretch={2.2} color="#7fd0ff" glow={1.8} spread={0.03} />
      {fx.dirt.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={track.sieve} count={14} speed={0.9} size={0.035} additive={false} color="#a8743a" glow={1} />
      ))}
      <Jets />
      <RecoilArrows />
      <Condensation />
      <Steam origin={[0, 1.4, 0]} intensity={track.steam} count={160} lifetime={3.0} riseSpeed={0.8} spread={1.6} size={1.1} opacity={0.12} />
      <Compare />
    </group>
  );
}
