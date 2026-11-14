import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { WaveFronts } from '../../engine/effects/WaveFronts';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { ANAL, ANUS, COLON_S, ESOPHAGUS, SMALL_R, colonR, smooth } from './anatomy';
import { Frames, POCKETS, chymeTravel, colonFrames, pocketR, pocketS, smallFrames } from './gas';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _t = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const hide = (mesh: THREE.InstancedMesh, i: number) => {
  _m.makeScale(0, 0, 0);
  mesh.setMatrixAt(i, _m);
};

export function useBubbleMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#eaf6ff',
        roughness: 0.04,
        metalness: 0.35,
        clearcoat: 1,
        transparent: true,
        opacity: 0.62,
        envMapIntensity: 2.6,
        depthWrite: false,
      }),
    [],
  );
}

// ---------------------------------------------------------------------------------------------
/** swallowed air: gulps travel down the oesophagus, collect as the gastric air bubble, some passes on */
const esoFrames = new Frames(ESOPHAGUS, 300);
const FUNDUS = new THREE.Vector3(0.6, 12.42, -0.05);
function AirBubbles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const big = useRef<THREE.Mesh>(null);
  const mat = useBubbleMaterial();
  const N = 18;
  const M = 12;
  useTimelineFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
    const vis = track.air(t);
    const t0 = track.T.air[0] + 0.3;
    let merged = 0;
    for (let i = 0; i < N; i++) {
      const g = Math.floor(i / 6);
      const tb = t0 + g * 1.25 + (i % 6) * 0.08;
      const age = t - tb;
      const run = 1.3;
      if (age < 0 || vis <= 0.002) {
        hide(mesh, i);
        continue;
      }
      const sz = (0.035 + 0.02 * hash2(i, 2)) * vis;
      if (age < run) {
        const u = smooth(0, run, age);
        esoFrames.offset(u * esoFrames.len, hash2(i, 3) * 6.28, 0.025 * hash2(i, 4), _p);
        _s.set(sz, sz * 1.5, sz);
        esoFrames.tangent(u * esoFrames.len, _t);
        _q.setFromUnitVectors(UP, _t);
      } else if (age < run + 0.5) {
        esoFrames.point(esoFrames.len, _p);
        _p.lerp(FUNDUS, smooth(run, run + 0.5, age));
        _s.setScalar(sz * (1 - smooth(run + 0.3, run + 0.5, age)));
        _q.identity();
      } else {
        merged++;
        hide(mesh, i);
        continue;
      }
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    // part of the swallowed air passes the pylorus and travels through the small intestine
    const passStart = track.T.air[1] - 1.6;
    for (let j = 0; j < M; j++) {
      const i = N + j;
      const age = t - (passStart + j * 0.22);
      const len = smallFrames.len;
      const s = age * 3.2;
      if (age < 0 || s > len + 0.4 || vis <= 0.002) {
        hide(mesh, i);
        continue;
      }
      smallFrames.offset(Math.min(s, len), hash2(j, 5) * 6.28, SMALL_R * 0.3 * hash2(j, 6), _p);
      const sz = (0.03 + 0.015 * hash2(j, 7)) * (1 - smooth(len - 0.1, len + 0.4, s)) * vis;
      smallFrames.tangent(Math.min(s, len), _t);
      _q.setFromUnitVectors(UP, _t);
      _s.set(sz, sz * 1.6, sz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (big.current) {
      const r = 0.2 * Math.cbrt(merged / N) * (1 - 0.3 * smooth(passStart, passStart + 3, t)) * vis;
      big.current.visible = r > 0.004;
      big.current.scale.set(r * 1.25, r, r * 1.1);
    }
  });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, mat, N + M]} frustumCulled={false} renderOrder={12}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <mesh ref={big} position={FUNDUS} material={mat} renderOrder={12}>
        <sphereGeometry args={[1, 32, 20]} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
/** chyme in the small intestine, faeces forming in the colon */
function Contents() {
  const smallRef = useRef<THREE.InstancedMesh>(null);
  const colonRef = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3 });
    return { small: m, colon: m.clone() };
  }, []);
  const NS = 80;
  const NC = 70;
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const cA = useMemo(() => [new THREE.Color('#d4b060'), new THREE.Color('#a8763c'), new THREE.Color('#8a5a2c'), new THREE.Color('#5a3a1e')], []);
  const colonEnd = COLON_S.rectum - 0.5;

  useTimelineFrame((t) => {
    const k = track.chyme(t);
    const sm = smallRef.current;
    const cm = colonRef.current;
    if (!sm || !cm) return;
    const len = smallFrames.len;
    for (let i = 0; i < NS; i++) {
      if (k <= 0.002) {
        hide(sm, i);
        continue;
      }
      let s = ((i / NS) * len + chymeTravel(t) + hash2(i, 1) * 0.2) % len;
      if (s < 0) s += len;
      smallFrames.offset(s, hash2(i, 2) * 6.28, SMALL_R * 0.45 * Math.sqrt(hash2(i, 3)), _p);
      const sz = (0.02 + 0.016 * hash2(i, 4)) * k * Math.min(1, s / 0.3, (len - s) / 0.25);
      _q.setFromAxisAngle(UP, hash2(i, 5) * 6);
      _s.set(sz, sz * (0.7 + 0.5 * hash2(i, 6)), sz * 0.9);
      _m.compose(_p, _q, _s);
      sm.setMatrixAt(i, _m);
      _c.copy(cA[0]).lerp(cA[1], s / len);
      sm.setColorAt(i, _c);
    }
    for (let i = 0; i < NC; i++) {
      if (k <= 0.002) {
        hide(cm, i);
        continue;
      }
      const span = colonEnd - 0.15;
      const s = 0.15 + ((((i / NC) * span + t * 0.05 + hash2(i, 1) * 0.3) % span) + span) % span;
      const R = colonR(s);
      // keep clear of gas pockets
      let clear = 1;
      for (let p = 0; p < POCKETS; p++) {
        const d = Math.abs(s - pocketS(p, t));
        clear = Math.min(clear, smooth(pocketR(p, t) * 0.6, pocketR(p, t) * 2.2 + 0.02, d));
      }
      colonFrames.offset(s, hash2(i, 2) * 6.28, R * 0.42 * Math.sqrt(hash2(i, 3)), _p);
      _p.y -= R * 0.18;
      const firm = s / colonEnd;
      const sz = R * (0.22 + 0.16 * hash2(i, 4)) * k * clear * Math.min(1, (colonEnd - s) / 0.3);
      _q.setFromAxisAngle(UP, hash2(i, 5) * 6);
      _s.set(sz, sz * (0.8 + 0.5 * hash2(i, 6)), sz * 0.85);
      _m.compose(_p, _q, _s);
      cm.setMatrixAt(i, _m);
      _c.copy(cA[1]).lerp(cA[2], Math.min(1, firm * 1.6)).lerp(cA[3], Math.max(0, firm * 1.6 - 1) * 0.8);
      cm.setColorAt(i, _c);
    }
    for (const m of [sm, cm]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={smallRef} args={[geo, mats.small, NS]} frustumCulled={false} />
      <instancedMesh ref={colonRef} args={[geo, mats.colon, NC]} frustumCulled={false} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
/** fermentation gas: small bubbles form along the colon and merge into larger pockets */
function ColonGas() {
  const small = useRef<THREE.InstancedMesh>(null);
  const pockets = useRef<THREE.InstancedMesh>(null);
  const sulfur = useRef<THREE.InstancedMesh>(null);
  const mat = useBubbleMaterial();
  const sMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd84a', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const N = 200;
  const NSUL = 40;
  useTimelineFrame((t) => {
    const sm = small.current;
    const pk = pockets.current;
    const su = sulfur.current;
    if (!sm || !pk || !su) return;
    const fade = 1 - smooth(57.5, 59, t);
    for (let i = 0; i < N; i++) {
      const P = 2.6 + 1.6 * hash2(i, 1);
      const local = t + hash2(i, 2) * P;
      const cyc = Math.floor(local / P);
      const age = local - cyc * P;
      const birth = t - age;
      if (birth < 0 || hash2(i, cyc + 7) > track.gasMake(birth)) {
        hide(sm, i);
        continue;
      }
      const hk = hash2(i, cyc + 13);
      const k = hk < 0.45 ? 0 : 1 + Math.min(2, Math.floor(((hk - 0.45) / 0.55) * 3));
      const s0 = Math.max(0.12, Math.min(COLON_S.rectum - 0.4, pocketS(k, birth) + (hash2(i, cyc + 17) - 0.65) * 1.8));
      const a0 = hash2(i, cyc + 19) * 6.28;
      const r0 = colonR(s0) * 0.62 * Math.sqrt(hash2(i, cyc + 23));
      const e = smooth(0.15, 0.95, age / P);
      const target = pocketR(k, t) > 0.005 ? pocketS(k, t) : s0;
      const s = s0 + (target - s0) * e;
      colonFrames.offset(s, a0, r0 * (1 - e), _p);
      const sz = (0.018 + 0.024 * hash2(i, cyc + 29)) * smooth(0, 0.35, age) * (1 - smooth(0.8, 1, age / P)) * fade;
      _s.setScalar(sz);
      _m.compose(_p, _q.identity(), _s);
      sm.setMatrixAt(i, _m);
    }
    sm.instanceMatrix.needsUpdate = true;
    for (let k = 0; k < POCKETS; k++) {
      const r = pocketR(k, t);
      const s = pocketS(k, t);
      colonFrames.point(s, _p);
      colonFrames.tangent(s, _t);
      _q.setFromUnitVectors(UP, _t);
      const v = Math.abs(pocketS(k, t + 0.05) - pocketS(k, t - 0.05)) / 0.1;
      const stretch = 1.35 + Math.min(0.9, v * 0.25);
      _s.set(r, r * stretch, r);
      _m.compose(_p, _q, _s);
      pk.setMatrixAt(k, _m);
    }
    pk.instanceMatrix.needsUpdate = true;
    // sulfur compounds (tiny, < 1 %): highlighted only while the narration talks about the smell
    const sv = track.smell(t);
    for (let i = 0; i < NSUL; i++) {
      if (sv <= 0.002) {
        hide(su, i);
        continue;
      }
      const k = i % POCKETS;
      const r = pocketR(k, t);
      const s = pocketS(k, t) + (hash2(i, 3) - 0.5) * r * 2.2;
      colonFrames.offset(s, hash2(i, 4) * 6.28 + t * 0.6, r * 0.9 * Math.sqrt(hash2(i, 5)), _p);
      _s.setScalar(0.009 * sv * (0.8 + 0.4 * Math.sin(t * 5 + i)));
      _m.compose(_p, _q.identity(), _s);
      su.setMatrixAt(i, _m);
    }
    su.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={small} args={[undefined, mat, N]} frustumCulled={false} renderOrder={12}>
        <sphereGeometry args={[1, 14, 10]} />
      </instancedMesh>
      <instancedMesh ref={pockets} args={[undefined, mat, POCKETS]} frustumCulled={false} renderOrder={13}>
        <sphereGeometry args={[1, 40, 28]} />
      </instancedMesh>
      <instancedMesh ref={sulfur} args={[undefined, sMat, NSUL]} frustumCulled={false} renderOrder={14}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
/** release: gas through the anal canal, stream outside, sound waves from the vibrating anal margin */
function Exit() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#cfe8ff', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const N = 90;
  const start = useMemo(() => ANAL.top.clone().addScaledVector(ANAL.dir, -0.02), []);
  const side = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const side2 = useMemo(() => new THREE.Vector3().crossVectors(ANAL.dir, side).normalize(), [side]);
  useTimelineFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
    const rel = track.release(t);
    const flow = Math.sqrt(Math.max(0, Math.sin(Math.PI * rel))) * track.external(t);
    for (let i = 0; i < N; i++) {
      if (flow <= 0.002) {
        hide(mesh, i);
        continue;
      }
      const u = (i / N + t * 0.9 + hash2(i, 1) * 0.05) % 1;
      const d = u * (ANAL.len + 1.4);
      const out = Math.max(0, d - ANAL.len);
      const a = hash2(i, 2) * 6.28;
      const r = (d < ANAL.len ? 0.025 : 0.03 + out * 0.32) * Math.sqrt(hash2(i, 3));
      _p.copy(start).addScaledVector(ANAL.dir, d).addScaledVector(side, Math.cos(a) * r).addScaledVector(side2, Math.sin(a) * r);
      const sz = (0.012 + 0.012 * hash2(i, 4)) * flow * (1 - smooth(0.7, 1, u));
      _q.setFromUnitVectors(UP, ANAL.dir);
      _s.set(sz, sz * 2.2, sz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, mat, N]} frustumCulled={false} renderOrder={15}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <WaveFronts origin={[ANUS.x + ANAL.dir.x * 0.05, ANUS.y + ANAL.dir.y * 0.05, ANUS.z + ANAL.dir.z * 0.05]} intensity={track.sound} maxRadius={1.1} count={5} period={0.75} color="#ffc65c" />
    </>
  );
}

/** stretch receptors / sensory nerve endings of the anal transition zone and the afferent fibre */
function Nerves() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe27a', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const N = 22;
  const fibre = useMemo(() => {
    const p0 = ANAL.top.clone().addScaledVector(ANAL.dir, 0.14).add(new THREE.Vector3(0, 0, -0.06));
    return new THREE.CatmullRomCurve3([p0, new THREE.Vector3(0.02, 8.32, -0.62), new THREE.Vector3(0.05, 8.75, -0.86), new THREE.Vector3(0.08, 9.4, -0.98), new THREE.Vector3(0.1, 10.0, -0.9)], false, 'centripetal');
  }, []);
  const side = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const side2 = useMemo(() => new THREE.Vector3().crossVectors(ANAL.dir, new THREE.Vector3(1, 0, 0)).normalize(), []);
  useTimelineFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
    const v = track.nerves(t);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.28;
      const d = 0.1 + 0.08 * hash2(i, 1);
      const r = 0.03 + 0.055 * track.internal(t);
      _p.copy(ANAL.top).addScaledVector(ANAL.dir, d).addScaledVector(side, Math.cos(a) * r).addScaledVector(side2, Math.sin(a) * r);
      const pulse = 0.7 + 0.3 * Math.sin(t * 9 + i * 1.7);
      _s.setScalar(0.011 * v * pulse);
      _m.compose(_p, _q.identity(), _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, mat, N]} frustumCulled={false} renderOrder={16}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <FlowParticles curve={fibre} intensity={track.nerves} count={26} travel={(t) => t * 1.4} size={0.012} stretch={2.5} color="#ffe27a" glow={2.2} />
    </>
  );
}

export function GutContents() {
  return (
    <group name="GutContents">
      <AirBubbles />
      <Contents />
      <ColonGas />
      <Exit />
      <Nerves />
    </group>
  );
}
