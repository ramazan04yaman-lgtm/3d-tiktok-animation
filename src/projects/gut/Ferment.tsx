import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { smooth } from './anatomy';
import { useBubbleMaterial } from './Contents';
import * as track from './script';

/** CPK colours */
const H = '#f2f2f2';
const C = '#3a3a3e';
const O = '#e8392c';
const SUL = '#f2c81c';
type Mol = { atoms: [number, number, number, string, number][] };
const MOLS: Record<'H2' | 'CO2' | 'CH4' | 'H2S', Mol> = {
  H2: { atoms: [[-0.37, 0, 0, H, 0.6], [0.37, 0, 0, H, 0.6]] },
  CO2: { atoms: [[0, 0, 0, C, 0.85], [-1.16, 0, 0, O, 0.8], [1.16, 0, 0, O, 0.8]] },
  CH4: { atoms: [[0, 0, 0, C, 0.85], [0.63, 0.63, 0.63, H, 0.55], [-0.63, -0.63, 0.63, H, 0.55], [-0.63, 0.63, -0.63, H, 0.55], [0.63, -0.63, -0.63, H, 0.55]] },
  H2S: { atoms: [[0, 0, 0, SUL, 1.0], [0.96, 0.62, 0, H, 0.55], [-0.96, 0.62, 0, H, 0.55]] },
};

/**
 * Magnifier into the caecum: rod- and coccus-shaped bacteria sit on undigested plant fibres,
 * break them down and release gas (H₂, CO₂, CH₄ as ball-and-stick molecules + tiny bubbles).
 * Strongly magnified (bacteria ≈ 1–2 µm).
 */
export function Ferment({ center, radius }: { center: [number, number, number]; radius: number }) {
  const R = radius;
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const shell = createXRayMaterial('#ffd2a0', []);
    const back = new THREE.MeshPhysicalMaterial({ color: '#1c0f0b', roughness: 0.3, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.BackSide });
    const fibre = new THREE.MeshPhysicalMaterial({ color: '#bfae6a', roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#fff2b0'), transparent: true });
    const bact = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.5, transparent: true });
    const atom = new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.8, transparent: true });
    return { shell, back, fibre, bact, atom };
  }, []);
  const bubbleMat = useBubbleMaterial();
  const fibres = useMemo(
    () =>
      [0, 1, 2, 3].map((k) => {
        const pts: THREE.Vector3[] = [];
        const y0 = (hash2(k, 1) - 0.5) * 0.9;
        const z0 = (hash2(k, 2) - 0.5) * 0.7;
        const tilt = (hash2(k, 3) - 0.5) * 0.9;
        for (let i = 0; i <= 8; i++) {
          const x = -1.2 + (2.4 * i) / 8;
          pts.push(new THREE.Vector3(x * R, (y0 + tilt * x * 0.4 + 0.08 * Math.sin(i * 1.7 + k)) * R, (z0 + 0.1 * Math.cos(i * 1.3 + k * 2)) * R));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const g = new THREE.TubeGeometry(curve, 80, (0.028 + 0.014 * hash2(k, 4)) * R, 10);
        return { curve, g };
      }),
    [R],
  );
  const NB = 46;
  const bactGeo = useMemo(() => ({ rod: new THREE.CapsuleGeometry(1, 2.2, 6, 12), coccus: new THREE.SphereGeometry(1, 16, 12) }), []);
  const palette = useMemo(() => ['#79b36a', '#d88a47', '#8f7cc4', '#4fb2c7', '#c9675f'].map((c) => new THREE.Color(c)), []);
  const NM = 18;
  const NBUB = 30;
  const rodRef = useRef<THREE.InstancedMesh>(null);
  const cocRef = useRef<THREE.InstancedMesh>(null);
  const atomRef = useRef<THREE.InstancedMesh>(null);
  const bubRef = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), t: new THREE.Vector3(), o: new THREE.Vector3(), e: new THREE.Euler() }), []);
  const MAX_ATOMS = NM * 5;
  const kinds = useMemo(() => {
    // H₂ and CO₂ dominate; methane only in some people ("manchmal"); H₂S traces appear with the smell sentence
    const list: (keyof typeof MOLS)[] = [];
    for (let i = 0; i < NM; i++) list.push(i % 6 === 5 ? 'CH4' : i % 2 === 0 ? 'H2' : 'CO2');
    list[3] = 'H2S';
    list[11] = 'H2S';
    return list;
  }, []);

  useTimelineFrame((t) => {
    const v = track.ferment(t);
    const g = group.current;
    if (!g) return;
    g.visible = v > 0.002;
    if (!g.visible) return;
    g.scale.setScalar(0.6 + 0.4 * v);
    mats.shell.uniforms.uOpacity.value = v;
    mats.back.opacity = 0.75 * v;
    mats.fibre.opacity = v;
    mats.bact.opacity = v;
    mats.atom.opacity = v;
    const prog = smooth(track.T.ferment[0] + 0.5, track.T.ferment[1] - 0.5, t);
    // fibres are broken down from their ends
    fibres.forEach((f, k) => {
      const keep = 1 - 0.55 * prog * (0.7 + 0.3 * hash2(k, 9));
      const n = f.g.index!.count;
      const segs = Math.floor((n / 6 / 10) * keep);
      f.g.setDrawRange(0, segs * 60);
    });
    // bacteria: cling to the fibres, wiggle
    const rod = rodRef.current!;
    const coc = cocRef.current!;
    let ri = 0;
    let ci = 0;
    for (let i = 0; i < NB; i++) {
      const f = fibres[i % fibres.length];
      const u = 0.08 + 0.84 * hash2(i, 1) * (1 - 0.45 * prog);
      f.curve.getPointAt(u, tmp.p);
      f.curve.getTangentAt(u, tmp.t);
      const a = hash2(i, 2) * 6.28 + 0.3 * Math.sin(t * 2 + i);
      tmp.o.set(0, Math.cos(a), Math.sin(a)).multiplyScalar(0.075 * R);
      tmp.p.add(tmp.o);
      tmp.p.x += 0.02 * R * Math.sin(t * 3.1 + i * 2.3);
      const isRod = hash2(i, 3) < 0.65;
      tmp.e.set(hash2(i, 4) * 3 + 0.2 * Math.sin(t * 1.7 + i), hash2(i, 5) * 3, hash2(i, 6) * 3 + 0.2 * Math.cos(t * 1.3 + i));
      tmp.q.setFromEuler(tmp.e);
      const sc = (isRod ? 0.042 : 0.055) * R * (0.85 + 0.3 * hash2(i, 7));
      tmp.s.setScalar(sc);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      tmp.c.copy(palette[Math.floor(hash2(i, 8) * palette.length)]);
      if (isRod) {
        rod.setMatrixAt(ri, tmp.m);
        rod.setColorAt(ri++, tmp.c);
      } else {
        coc.setMatrixAt(ci, tmp.m);
        coc.setColorAt(ci++, tmp.c);
      }
    }
    for (const m of [rod, coc]) {
      m.count = m === rod ? ri : ci;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    // gas molecules drift away from the bacteria
    const am = atomRef.current!;
    let ai = 0;
    const gasOn = smooth(track.T.ferment[0] + 1.2, track.T.ferment[0] + 2.4, t);
    const sulfurOn = track.smell(t);
    for (let i = 0; i < NM; i++) {
      const kind = kinds[i];
      const on = kind === 'H2S' ? Math.max(sulfurOn, 0) : gasOn;
      const life = (hash2(i, 1) + t * 0.16) % 1;
      const b = fibres[i % fibres.length];
      b.curve.getPointAt(0.15 + 0.7 * hash2(i, 2), tmp.p);
      tmp.o.set(hash2(i, 3) - 0.5, hash2(i, 4) * 0.8 + 0.2, hash2(i, 5) - 0.5).normalize().multiplyScalar(life * 0.65 * R);
      tmp.p.add(tmp.o);
      const fade = Math.sin(Math.PI * life) * on;
      tmp.e.set(t * 0.8 + i, t * 0.6 + i * 2, 0);
      tmp.q.setFromEuler(tmp.e);
      const scale = 0.038 * R * (kind === 'H2S' ? 1.15 : 1) * fade;
      for (const [x, y, z, col, r] of MOLS[kind].atoms) {
        tmp.t.set(x, y, z).multiplyScalar(scale).applyQuaternion(tmp.q).add(tmp.p);
        tmp.s.setScalar(r * scale * 0.62);
        tmp.m.compose(tmp.t, tmp.q, tmp.s);
        am.setMatrixAt(ai, tmp.m);
        am.setColorAt(ai++, tmp.c.set(col));
      }
    }
    am.count = ai;
    am.instanceMatrix.needsUpdate = true;
    if (am.instanceColor) am.instanceColor.needsUpdate = true;
    const bm = bubRef.current!;
    for (let i = 0; i < NBUB; i++) {
      const life = (hash2(i, 11) + t * 0.22) % 1;
      const b = fibres[i % fibres.length];
      b.curve.getPointAt(0.1 + 0.8 * hash2(i, 12), tmp.p);
      tmp.p.y += life * 0.7 * R;
      tmp.p.x += Math.sin(t * 2 + i) * 0.03 * R;
      tmp.s.setScalar((0.02 + 0.03 * hash2(i, 13)) * R * (0.3 + life) * Math.sin(Math.PI * life) * gasOn);
      tmp.m.compose(tmp.p, tmp.q.identity(), tmp.s);
      bm.setMatrixAt(i, tmp.m);
    }
    bm.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} position={center} name="Fermentation">
      <mesh material={mats.back} renderOrder={30}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
      {fibres.map((f, i) => (
        <mesh key={i} geometry={f.g} material={mats.fibre} renderOrder={31} />
      ))}
      <instancedMesh ref={rodRef} args={[bactGeo.rod, mats.bact, NB]} frustumCulled={false} renderOrder={32} />
      <instancedMesh ref={cocRef} args={[bactGeo.coccus, mats.bact, NB]} frustumCulled={false} renderOrder={32} />
      <instancedMesh ref={atomRef} args={[undefined, mats.atom, MAX_ATOMS]} frustumCulled={false} renderOrder={33}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <instancedMesh ref={bubRef} args={[undefined, bubbleMat, NBUB]} frustumCulled={false} renderOrder={34}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <mesh material={mats.shell} renderOrder={35}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
    </group>
  );
}
