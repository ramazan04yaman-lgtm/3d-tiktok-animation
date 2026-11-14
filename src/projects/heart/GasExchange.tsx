import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import * as track from './script';

const BLUE = new THREE.Color('#3d6dff');
const RED = new THREE.Color('#ff3a2e');

/**
 * Magnifier: one alveolus with a capillary. Red blood cells pass by, release CO₂ into the air space
 * and take up O₂ (blue → red colour code). Strongly magnified and slowed down (real contact ≈ 0.75 s).
 */
export function GasExchange({ center, radius = 0.6 }: { center: [number, number, number]; radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const R = radius;
  const capillary = useMemo(
    () => new THREE.CatmullRomCurve3([[-1.1, -0.42, 0.1], [-0.55, -0.32, 0.3], [0, -0.25, 0.42], [0.55, -0.32, 0.3], [1.1, -0.42, 0.1]].map(([x, y, z]) => new THREE.Vector3(x * R, y * R, z * R)), false, 'centripetal'),
    [R],
  );
  const mats = useMemo(() => {
    const shell = createXRayMaterial('#8fd0ff', []);
    const back = new THREE.MeshPhysicalMaterial({ color: '#0b1520', roughness: 0.2, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.BackSide });
    const alv = new THREE.MeshPhysicalMaterial({ color: '#f2a7ae', roughness: 0.5, sheen: 0.8, sheenColor: new THREE.Color('#ffd0d6'), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.FrontSide });
    const alvEdge = createXRayMaterial('#ffb3c1', []);
    alvEdge.uniforms.uPower.value = 2.6;
    alvEdge.uniforms.uBase.value = 0.0;
    const cap = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const rbc = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 });
    const co2 = new THREE.MeshBasicMaterial({ color: '#c7b8ff', toneMapped: false, transparent: true });
    const o2 = new THREE.MeshBasicMaterial({ color: '#9ff3ff', toneMapped: false, transparent: true });
    return { shell, back, alv, alvEdge, cap, rbc, co2, o2 };
  }, []);
  const geo = useMemo(() => {
    const capG = new THREE.TubeGeometry(capillary, 64, 0.075 * R, 16);
    const n = capG.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const u = Math.floor(i / 17) / 64;
      c.copy(BLUE).lerp(RED, THREE.MathUtils.smoothstep(u, 0.35, 0.65));
      col.set([c.r, c.g, c.b], i * 3);
    }
    capG.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // biconcave red blood cell (lathe profile)
    // Evans–Fung shape: h(x) = √(1−x²)·(c0 + c2·x² + c4·x⁴)
    const prof: THREE.Vector2[] = [];
    const h = (x: number) => 0.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4) * 0.5;
    for (let i = 0; i <= 14; i++) {
      const x = Math.sin((i / 14) * (Math.PI / 2));
      prof.push(new THREE.Vector2(x * 0.5 + 1e-4, -h(x)));
    }
    for (let i = 14; i >= 0; i--) {
      const x = Math.sin((i / 14) * (Math.PI / 2));
      prof.push(new THREE.Vector2(x * 0.5 + 1e-4, h(x)));
    }
    const rbc = new THREE.LatheGeometry(prof, 24);
    return { capG, rbc };
  }, [capillary, R]);

  const alveoli = useMemo(
    () => [
      [0, 0.18, 0, 0.36],
      [-0.33, 0.05, -0.12, 0.24],
      [0.34, 0.06, -0.1, 0.25],
      [-0.12, 0.48, -0.15, 0.22],
      [0.2, 0.44, -0.18, 0.21],
      [0.02, 0.1, -0.38, 0.26],
    ].map(([x, y, z, r]) => ({ p: new THREE.Vector3(x * R, y * R, z * R), r: r * R })),
    [R],
  );

  const N_RBC = 9;
  const N_GAS = 14;
  const rbcRef = useRef<THREE.InstancedMesh>(null);
  const co2Ref = useRef<THREE.InstancedMesh>(null);
  const o2Ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), t: new THREE.Vector3(), a: new THREE.Vector3() }), []);
  const AIR = alveoli[0].p;

  useTimelineFrame((t) => {
    const v = track.gas(t);
    if (group.current) {
      group.current.visible = v > 0.002;
      group.current.scale.setScalar(0.6 + 0.4 * v);
    }
    if (v <= 0.002) return;
    mats.shell.uniforms.uOpacity.value = v;
    mats.back.opacity = 0.6 * v;
    mats.alv.opacity = 0.12 * v;
    mats.alvEdge.uniforms.uOpacity.value = 0.9 * v;
    mats.cap.opacity = 0.42 * v;
    const rbc = rbcRef.current!;
    for (let i = 0; i < N_RBC; i++) {
      const u = (i / N_RBC + t * 0.07) % 1;
      capillary.getPointAt(u, tmp.p);
      capillary.getTangentAt(u, tmp.t);
      tmp.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.t);
      tmp.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2 + hash2(i, 3) * 0.6));
      tmp.p.y += (hash2(i, 4) - 0.5) * 0.04 * R;
      const edge = Math.min(1, u / 0.06, (1 - u) / 0.06);
      tmp.s.setScalar(0.15 * R * edge * v);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      rbc.setMatrixAt(i, tmp.m);
      tmp.c.copy(BLUE).lerp(RED, THREE.MathUtils.smoothstep(u, 0.38, 0.62)).multiplyScalar(0.9);
      rbc.setColorAt(i, tmp.c);
    }
    rbc.instanceMatrix.needsUpdate = true;
    if (rbc.instanceColor) rbc.instanceColor.needsUpdate = true;
    // gas particles: CO₂ capillary → air space, O₂ air space → capillary
    for (const [ref, out] of [
      [co2Ref.current!, true],
      [o2Ref.current!, false],
    ] as const) {
      for (let i = 0; i < N_GAS; i++) {
        const seed = out ? i : i + 100;
        const life = (hash2(seed, 1) + t * 0.32) % 1;
        const uc = 0.35 + 0.3 * hash2(seed, 2);
        capillary.getPointAt(uc, tmp.a);
        tmp.p.set(AIR.x + (hash2(seed, 3) - 0.5) * 0.5 * R, AIR.y + (hash2(seed, 4) - 0.2) * 0.4 * R, AIR.z + (hash2(seed, 5) - 0.5) * 0.4 * R);
        const k = out ? life : 1 - life;
        tmp.t.copy(tmp.a).lerp(tmp.p, k);
        const fade = Math.sin(Math.PI * life);
        tmp.s.setScalar(0.034 * R * fade * v);
        tmp.m.compose(tmp.t, tmp.q.identity(), tmp.s);
        ref.setMatrixAt(i, tmp.m);
      }
      ref.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={center} name="GasExchange">
      <mesh material={mats.back} renderOrder={30}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
      {alveoli.map((a, i) => (
        <group key={i} position={a.p}>
          <mesh material={mats.alv} renderOrder={31}>
            <sphereGeometry args={[a.r, 32, 20]} />
          </mesh>
          <mesh material={mats.alvEdge} renderOrder={36}>
            <sphereGeometry args={[a.r, 32, 20]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={geo.capG} material={mats.cap} renderOrder={33} />
      <instancedMesh ref={rbcRef} args={[geo.rbc, mats.rbc, N_RBC]} frustumCulled={false} renderOrder={32} />
      <instancedMesh ref={co2Ref} args={[undefined, mats.co2, N_GAS]} frustumCulled={false} renderOrder={34}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <instancedMesh ref={o2Ref} args={[undefined, mats.o2, N_GAS]} frustumCulled={false} renderOrder={34}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <mesh material={mats.shell} renderOrder={35}>
        <sphereGeometry args={[R, 48, 32]} />
      </mesh>
    </group>
  );
}
