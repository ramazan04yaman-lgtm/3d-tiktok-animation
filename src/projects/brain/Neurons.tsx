import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { NA, NB, NET_C, PULSES, SYN } from './script';
import * as track from './script';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const UP = v(0, 1, 0);

/** a dendrite tree: primary branches from the soma, each with 1–2 side branches */
function dendrites(soma: THREE.Vector3, seed: number, scale: number, n = 6, first?: THREE.Vector3) {
  const curves: { curve: THREE.CatmullRomCurve3; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    let dir: THREE.Vector3;
    if (i === 0 && first) dir = first.clone().sub(soma).normalize();
    else dir = v(hash2(seed + i, 1) - 0.5, hash2(seed + i, 2) - 0.45, (hash2(seed + i, 3) - 0.5) * 0.8).normalize();
    const pts = [soma.clone()];
    let p = soma.clone();
    const seg = (i === 0 && first ? first.distanceTo(soma) / 4 : 0.07 * scale) as number;
    for (let k = 0; k < 4; k++) {
      const jit = i === 0 && first ? 0.004 : 0.03 * scale;
      p = p.clone().addScaledVector(dir, seg).add(v((hash2(seed + i * 7 + k, 4) - 0.5) * jit, (hash2(seed + i * 7 + k, 5) - 0.5) * jit, (hash2(seed + i * 7 + k, 6) - 0.5) * jit));
      pts.push(p);
    }
    if (i === 0 && first) pts[pts.length - 1] = first.clone();
    curves.push({ curve: new THREE.CatmullRomCurve3(pts), r: 0.011 * scale });
    // side branches
    for (let b = 0; b < 2; b++) {
      const from = pts[1 + b * 2];
      const bd = dir.clone().add(v(hash2(seed + i, 10 + b) - 0.5, hash2(seed + i, 12 + b) - 0.5, hash2(seed + i, 14 + b) - 0.5).multiplyScalar(1.4)).normalize();
      const q = [from.clone()];
      let c = from.clone();
      for (let k = 0; k < 3; k++) {
        c = c.clone().addScaledVector(bd, 0.05 * scale).add(v((hash2(seed + i + b, 20 + k) - 0.5) * 0.02 * scale, (hash2(seed + i + b, 23 + k) - 0.5) * 0.02 * scale, 0));
        q.push(c);
      }
      curves.push({ curve: new THREE.CatmullRomCurve3(q), r: 0.006 * scale });
    }
  }
  return curves;
}

/** axon of A: soma → terminal at the synapse on B's dendrite */
export const AXON = new THREE.CatmullRomCurve3([v(NA[0] + 0.05, NA[1] - 0.01, NA[2]), v(-0.25, 3.44, 0.63), v(-0.02, 3.4, 0.6), v(0.2, 3.33, 0.58), v(SYN[0] - 0.025, SYN[1] + 0.003, SYN[2])]);
/** internodes (myelin) as [u0, u1] along the axon */
const SHEATHS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let u = 0.08; u < 0.9; u += 0.11) out.push([u, Math.min(0.92, u + 0.092)]);
  return out;
})();
const NODES = [SHEATHS[0][0], ...SHEATHS.map((s) => s[1])];
/** saltatory conduction: the spike waits at a node, then jumps to the next one */
function salt(s: number) {
  const n = NODES.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, s * n));
  const k = Math.floor(x);
  const f = x - k;
  const j = f < 0.6 ? 0 : (f - 0.6) / 0.4;
  return NODES[k] + (NODES[k + 1] - NODES[k]) * j * j * (3 - 2 * j);
}
/** spike position along the axon at time t (first slow spike + quick learning spikes), −1 = none */
function spikeAt(t: number) {
  if (t > 15.6 && t < 22.6) return salt(track.spike(t));
  for (const p of PULSES) if (t > p && t < p + 0.55) return salt((t - p) / 0.55);
  return -1;
}

export function Neurons() {
  const data = useMemo(() => {
    const A = v(...NA), B = v(...NB);
    const dA = dendrites(A, 11, 1.0, 6);
    // B's first dendrite reaches just past the synapse
    const dB = dendrites(B, 31, 1.0, 6, v(SYN[0] - 0.012, SYN[1] - 0.022, SYN[2]));
    // background neurons in the cortex patch
    const bg: { soma: THREE.Vector3; dend: { curve: THREE.CatmullRomCurve3; r: number }[]; axon: THREE.CatmullRomCurve3 }[] = [];
    for (let i = 0; i < 46; i++) {
      const soma = v(NET_C[0] + (hash2(i, 41) - 0.5) * 2.6, NET_C[1] + (hash2(i, 42) - 0.5) * 1.2, NET_C[2] + (hash2(i, 43) - 0.5) * 1.0);
      if (soma.distanceTo(A) < 0.22 || soma.distanceTo(B) < 0.22 || soma.distanceTo(v(...SYN)) < 0.25) continue;
      const sc = 0.7 + 0.5 * hash2(i, 44);
      const dir = v(hash2(i, 45) - 0.5, hash2(i, 46) - 0.5, hash2(i, 47) - 0.5).normalize();
      const ax = new THREE.CatmullRomCurve3([soma.clone(), soma.clone().addScaledVector(dir, 0.3).add(v(0, 0.05, 0)), soma.clone().addScaledVector(dir, 0.65).add(v(0.05, -0.08, 0.02)), soma.clone().addScaledVector(dir, 0.95)]);
      bg.push({ soma, dend: dendrites(soma, 100 + i * 13, sc, 5), axon: ax });
    }
    const tubes = (list: { curve: THREE.Curve<THREE.Vector3>; r: number }[]) => mergeGeometries(list.map(({ curve, r }) => new THREE.TubeGeometry(curve, 12, r, 6, false)));
    const bgGeo = tubes(bg.flatMap((n) => [...n.dend, { curve: n.axon, r: 0.006 }]));
    const aGeo = tubes(dA);
    const bGeo = tubes(dB);
    const axonGeo = new THREE.TubeGeometry(AXON, 160, 0.009, 8, false);
    const strongGeo = new THREE.TubeGeometry(AXON, 160, 0.016, 10, false);
    // synapse contact points on B's dendrites
    const contacts: THREE.Vector3[] = [];
    for (let i = 0; i < 260; i++) {
      const d = dB[i % dB.length].curve;
      const p = d.getPointAt(0.15 + 0.85 * hash2(i, 51));
      contacts.push(p.add(v((hash2(i, 52) - 0.5) * 0.012, (hash2(i, 53) - 0.5) * 0.012, (hash2(i, 54) - 0.5) * 0.012)));
    }
    // memory pattern: a chain of background neurons
    const chain = bg.filter((_, i) => i % 3 === 0).slice(0, 12).map((n) => n.soma);
    const edges = chain.slice(1).map((p, i) => {
      const a = chain[i];
      const m = a.clone().lerp(p, 0.5).add(v(0, 0.08, 0.04));
      return new THREE.CatmullRomCurve3([a, m, p]);
    });
    const edgeGeo = mergeGeometries(edges.map((c) => new THREE.TubeGeometry(c, 16, 0.007, 6, false)));
    const inputCurves = dA.filter((d) => d.r > 0.009).map((d) => new THREE.CatmullRomCurve3(d.curve.points.slice().reverse()));
    return { A, B, bg, bgGeo, aGeo, bGeo, axonGeo, strongGeo, contacts, chain, edges, edgeGeo, inputCurves };
  }, []);

  const mats = useMemo(() => ({
    bg: new THREE.MeshStandardMaterial({ color: '#3b3f7a', emissive: new THREE.Color('#4a5cff'), emissiveIntensity: 0.35, roughness: 0.5, transparent: true }),
    a: new THREE.MeshStandardMaterial({ color: '#7f8cff', emissive: new THREE.Color('#7f9cff'), emissiveIntensity: 0.6, roughness: 0.4, transparent: true }),
    b: new THREE.MeshStandardMaterial({ color: '#b07fff', emissive: new THREE.Color('#b07fff'), emissiveIntensity: 0.5, roughness: 0.4, transparent: true }),
    somaA: new THREE.MeshStandardMaterial({ color: '#8fa0ff', emissive: new THREE.Color('#9fd4ff'), emissiveIntensity: 0.6, roughness: 0.35, transparent: true }),
    somaB: new THREE.MeshStandardMaterial({ color: '#c09aff', emissive: new THREE.Color('#d0a0ff'), emissiveIntensity: 0.5, roughness: 0.35, transparent: true }),
    somaBg: new THREE.MeshStandardMaterial({ color: '#4a4f9a', emissive: new THREE.Color('#5a6cff'), emissiveIntensity: 0.4, roughness: 0.4, transparent: true }),
    myelin: new THREE.MeshPhysicalMaterial({ color: '#f1e9da', roughness: 0.35, clearcoat: 0.6, transparent: true }),
    axon: new THREE.MeshStandardMaterial({ color: '#7f8cff', emissive: new THREE.Color('#7f9cff'), emissiveIntensity: 0.5, transparent: true }),
    strong: new THREE.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    spike: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    node: new THREE.MeshBasicMaterial({ color: '#7fe0ff', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    bouton: new THREE.MeshStandardMaterial({ color: '#8fa0ff', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.2, roughness: 0.35, transparent: true }),
    contact: new THREE.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false, transparent: true, depthWrite: false }),
    edge: new THREE.MeshBasicMaterial({ color: '#7fe0ff', toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  }), []);

  const group = useRef<THREE.Group>(null);
  const sheaths = useRef<THREE.InstancedMesh>(null);
  const nodes = useRef<THREE.InstancedMesh>(null);
  const somaBg = useRef<THREE.InstancedMesh>(null);
  const spikeRef = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Mesh>(null);
  const somaA = useRef<THREE.Mesh>(null);
  const somaB = useRef<THREE.Mesh>(null);
  const bouton = useRef<THREE.Group>(null);
  const contactRef = useRef<THREE.InstancedMesh>(null);
  const chainRef = useRef<THREE.InstancedMesh>(null);
  const _t = useMemo(() => v(0, 0, 0), []);

  useTimelineFrame((t) => {
    const k = track.net(t);
    if (group.current) group.current.visible = k > 0.002;
    for (const m of [mats.bg, mats.a, mats.b, mats.somaA, mats.somaB, mats.somaBg, mats.myelin, mats.axon, mats.bouton]) {
      m.opacity = k;
      m.depthWrite = k > 0.5;
    }
    // static instanced parts (positions never change)
    const sm = sheaths.current!;
    SHEATHS.forEach(([u0, u1], i) => {
      AXON.getPointAt((u0 + u1) / 2, _p);
      AXON.getTangentAt((u0 + u1) / 2, _t);
      _q.setFromUnitVectors(UP, _t.normalize());
      const len = AXON.getLength() * (u1 - u0);
      _m.compose(_p, _q, _s.set(1, len, 1));
      sm.setMatrixAt(i, _m);
    });
    sm.instanceMatrix.needsUpdate = true;
    // spike + node flashes
    const u = spikeAt(t);
    const nm = nodes.current!;
    NODES.forEach((nu, i) => {
      AXON.getPointAt(nu, _p);
      const near = u < 0 ? 0 : Math.max(0, 1 - Math.abs(u - nu) / 0.05);
      _m.compose(_p, _q.identity(), _s.setScalar(0.012 + 0.02 * near));
      nm.setMatrixAt(i, _m);
    });
    nm.instanceMatrix.needsUpdate = true;
    mats.node.opacity = 0.35 + 0.65 * (u < 0 ? 0 : 1);
    if (spikeRef.current && trail.current) {
      spikeRef.current.visible = u >= 0 && k > 0.1;
      trail.current.visible = u >= 0 && k > 0.1;
      if (u >= 0) {
        AXON.getPointAt(u, _p);
        spikeRef.current.position.copy(_p);
        AXON.getPointAt(Math.max(0, u - 0.04), _p);
        trail.current.position.copy(_p);
      }
    }
    // somas: A flashes when it fires (and in the learning pulses), B lights up when the signal arrives
    const pulseA = PULSES.reduce((s, p) => Math.max(s, Math.max(0, 1 - Math.abs(t - p) / 0.25)), 0);
    const pulseB = PULSES.reduce((s, p) => Math.max(s, Math.max(0, 1 - Math.abs(t - p - 0.6) / 0.25)), 0);
    const arrive = Math.max(0, 1 - Math.abs(t - 38.0) / 0.6);
    mats.somaA.emissiveIntensity = 0.6 + 4 * Math.max(track.fireA(t), pulseA);
    mats.somaB.emissiveIntensity = 0.5 + 4 * Math.max(arrive, pulseB);
    if (somaA.current) somaA.current.scale.setScalar(1 + 0.15 * Math.max(track.fireA(t), pulseA));
    if (somaB.current) somaB.current.scale.setScalar(1 + 0.15 * Math.max(arrive, pulseB));
    // terminal + learning (stronger synapse: bigger terminal, extra contacts, glowing pathway)
    const st = track.strength(t);
    mats.bouton.emissiveIntensity = 0.2 + 2.5 * track.terminal(t) + 2 * pulseB;
    if (bouton.current) {
      bouton.current.scale.setScalar(1 + 0.7 * st);
      bouton.current.children.forEach((c, i) => (c.visible = i === 0 || st > 0.3 + 0.2 * i));
    }
    mats.strong.opacity = 0.7 * st;
    // contacts on B
    const cm = contactRef.current!;
    const c = track.contacts(t);
    data.contacts.forEach((p, i) => {
      const s = hash2(i, 60) < c ? 0.0045 : 0;
      _m.compose(p, _q.identity(), _s.setScalar(s));
      cm.setMatrixAt(i, _m);
    });
    cm.instanceMatrix.needsUpdate = true;
    // memory pattern
    mats.edge.opacity = 0.9 * track.pattern(t);
    const ch = chainRef.current!;
    data.chain.forEach((p, i) => {
      const s = 0.03 * track.pattern(t) * (0.8 + 0.2 * Math.sin(t * 6 + i));
      _m.compose(p, _q.identity(), _s.setScalar(s));
      ch.setMatrixAt(i, _m);
    });
    ch.instanceMatrix.needsUpdate = true;
    const bm = somaBg.current!;
    data.bg.forEach((n, i) => {
      _m.compose(n.soma, _q.identity(), _s.setScalar(0.03 * (0.8 + 0.4 * hash2(i, 70))));
      bm.setMatrixAt(i, _m);
    });
    bm.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} name="Neurons">
      <mesh geometry={data.bgGeo} material={mats.bg} />
      <instancedMesh ref={somaBg} args={[undefined, mats.somaBg, data.bg.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <mesh geometry={data.aGeo} material={mats.a} />
      <mesh geometry={data.bGeo} material={mats.b} />
      <mesh ref={somaA} material={mats.somaA} position={NA}>
        <sphereGeometry args={[0.05, 32, 24]} />
      </mesh>
      <mesh ref={somaB} material={mats.somaB} position={NB}>
        <sphereGeometry args={[0.048, 32, 24]} />
      </mesh>
      <mesh geometry={data.axonGeo} material={mats.axon} />
      <mesh geometry={data.strongGeo} material={mats.strong} renderOrder={12} />
      <instancedMesh ref={sheaths} args={[undefined, mats.myelin, SHEATHS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.02, 0.02, 1, 20, 1]} />
      </instancedMesh>
      <instancedMesh ref={nodes} args={[undefined, mats.node, NODES.length]} frustumCulled={false} renderOrder={13}>
        <sphereGeometry args={[1, 12, 8]} />
      </instancedMesh>
      <mesh ref={spikeRef} material={mats.spike} renderOrder={14}>
        <sphereGeometry args={[0.022, 16, 12]} />
      </mesh>
      <mesh ref={trail} material={mats.node} renderOrder={14}>
        <sphereGeometry args={[0.016, 12, 8]} />
      </mesh>
      <group ref={bouton} position={SYN}>
        <mesh material={mats.bouton} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.024, 24, 16]} />
        </mesh>
        <mesh material={mats.bouton} position={[-0.01, -0.03, 0.025]}>
          <sphereGeometry args={[0.014, 16, 12]} />
        </mesh>
        <mesh material={mats.bouton} position={[0.02, -0.03, -0.02]}>
          <sphereGeometry args={[0.013, 16, 12]} />
        </mesh>
      </group>
      <instancedMesh ref={contactRef} args={[undefined, mats.contact, data.contacts.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
      <mesh geometry={data.edgeGeo} material={mats.edge} renderOrder={12} />
      <instancedMesh ref={chainRef} args={[undefined, mats.edge, data.chain.length]} frustumCulled={false} renderOrder={12}>
        <sphereGeometry args={[1, 12, 8]} />
      </instancedMesh>
      {data.inputCurves.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={track.inputs} count={6} speed={0.12} size={0.008} color="#9fe0ff" glow={2.5} />
      ))}
      {data.edges.map((c, i) => (
        <FlowParticles key={`e${i}`} curve={c} intensity={track.pattern} count={4} speed={0.4} size={0.012} color="#ffffff" glow={2} />
      ))}
    </group>
  );
}
