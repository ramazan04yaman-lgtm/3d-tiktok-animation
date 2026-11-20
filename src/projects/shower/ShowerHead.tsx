import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Steam } from '../../engine/effects/Steam';
import { noise3 } from '../../engine/geometry/noise';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { fingerGeometry } from '../papercut/finger';
import { HEAD, NOZZLES, NUB, PLATE, chamberTop, housingGeometry } from './head';
import * as track from './script';

/** section plane through the head (keeps x ≤ 0, camera looks from +x) */
export const headCut = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100);

/** metal with a flat "cut steel" colour on back faces seen through the section */
function sectionMetal(params: THREE.MeshPhysicalMaterialParameters, cutColor: string) {
  const m = new THREE.MeshPhysicalMaterial({ ...params, side: THREE.DoubleSide, clippingPlanes: [headCut] });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      if (!gl_FrontFacing) gl_FragColor = vec4(${new THREE.Color(cutColor).toArray().map((v) => v.toFixed(3)).join(', ')}, 1.0);`,
    );
  };
  m.customProgramCacheKey = () => `mx-section-metal-${cutColor}`;
  return m;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

export function ShowerHead() {
  const geo = useMemo(() => {
    const housing = housingGeometry();
    const plate = new THREE.CylinderGeometry(PLATE.r, PLATE.r, PLATE.top - PLATE.bottom, 96, 1);
    plate.translate(0, (PLATE.top + PLATE.bottom) / 2, 0);
    const nub = new THREE.CylinderGeometry(NUB.r * 0.75, NUB.r, NUB.len, 16, 1);
    nub.translate(0, PLATE.bottom - NUB.len / 2, 0);
    // biofilm: bumpy slime layer on the chamber floor (height field, scaled by growth)
    const film = new THREE.CircleGeometry(PLATE.r - 0.004, 96).rotateX(-Math.PI / 2);
    film.translate(0, PLATE.top + 0.001, 0);
    const pos = film.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const a = new THREE.Color('#c27a7c'), b = new THREE.Color('#6d5a2c'), d = new THREE.Color('#2a2418');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = noise3(x * 18, 0, z * 18);
      const n2 = noise3(x * 60, 3, z * 60);
      pos.setY(i, PLATE.top + 0.002 + 0.012 * Math.max(0, 0.5 + n) + 0.004 * n2);
      _c.copy(a).lerp(b, Math.max(0, Math.min(1, 0.5 + n * 1.4))).lerp(d, Math.max(0, n2 - 0.25) * 1.2);
      col.set([_c.r, _c.g, _c.b], i * 3);
    }
    film.setAttribute('color', new THREE.BufferAttribute(col, 3));
    film.computeVertexNormals();
    const water = new THREE.CylinderGeometry(PLATE.r - 0.003, PLATE.r - 0.003, 1, 96, 1);
    water.translate(0, 0.5, 0);
    const fing = fingerGeometry().clone();
    return { housing, plate, nub, film, water, finger: fing };
  }, []);

  const mats = useMemo(() => {
    const chrome = sectionMetal({ color: '#d9dde2', metalness: 1, roughness: 0.12, clearcoat: 0.6 }, '#7b8088');
    const plate = sectionMetal({ color: '#c9ced4', metalness: 0.2, roughness: 0.35, clearcoat: 0.5, emissive: '#2a2e33' }, '#6d7178');
    const pipe = new THREE.MeshPhysicalMaterial({ color: '#d9dde2', metalness: 1, roughness: 0.12, clearcoat: 0.6 });
    const nub = new THREE.MeshPhysicalMaterial({ color: '#cfd3d6', roughness: 0.45, clearcoat: 0.2, clippingPlanes: [headCut] });
    const plug = new THREE.MeshPhysicalMaterial({ color: '#2e2619', roughness: 0.3, clearcoat: 0.8, clippingPlanes: [headCut] });
    const kalk = new THREE.MeshPhysicalMaterial({ color: '#ece7dc', roughness: 0.7, clippingPlanes: [headCut] });
    const film = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.92, clippingPlanes: [headCut] });
    const water = new THREE.MeshPhysicalMaterial({ color: '#5aaedc', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [headCut] });
    const drop = new THREE.MeshPhysicalMaterial({ color: '#e6f6ff', roughness: 0.04, metalness: 0.25, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 2.2, depthWrite: false });
    const skin = new THREE.MeshPhysicalMaterial({ color: '#e0a88f', roughness: 0.5, sheen: 0.8, sheenColor: new THREE.Color('#ffb59a'), emissive: '#4a2a20', transparent: true });
    const bubble = drop.clone();
    return { chrome, plate, pipe, nub, plug, kalk, film, water, drop, skin, bubble };
  }, []);

  const nubRef = useRef<THREE.InstancedMesh>(null);
  const plugRef = useRef<THREE.InstancedMesh>(null);
  const kalkRef = useRef<THREE.InstancedMesh>(null);
  const jetRef = useRef<THREE.InstancedMesh>(null);
  const filmRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const fingerRef = useRef<THREE.Group>(null);
  const bubRef = useRef<THREE.InstancedMesh>(null);
  const N = NOZZLES.length;
  const K = 22;
  const NK = 900;
  const NB = 80;

  useTimelineFrame((t) => {
    headCut.constant = track.cut(t) > 0.002 ? 0.7 * (1 - track.cut(t)) : 100;
    // nubs (static) + plugs on clogged nozzles
    const nubs = nubRef.current!;
    const plugs = plugRef.current!;
    const clog = track.clog(t);
    NOZZLES.forEach((n, i) => {
      _m.makeTranslation(n.p.x, 0, n.p.z);
      nubs.setMatrixAt(i, _m);
      const s = n.clogged ? clog * (0.012 + 0.006 * hash2(i, 2)) : 0;
      _m.compose(_p.set(n.p.x, PLATE.bottom - NUB.len + 0.004, n.p.z), _q.identity(), _s.set(s * 1.1, s * 0.7, s * 1.1));
      plugs.setMatrixAt(i, _m);
    });
    nubs.instanceMatrix.needsUpdate = true;
    plugs.instanceMatrix.needsUpdate = true;
    // limescale crystals on the chamber floor and walls
    const kr = kalkRef.current!;
    const kv = track.kalk(t);
    for (let i = 0; i < NK; i++) {
      const r = Math.sqrt(hash2(i, 1)) * (PLATE.r - 0.01);
      const a = hash2(i, 2) * Math.PI * 2;
      const onWall = hash2(i, 3) < 0.25;
      const y = onWall ? PLATE.top + hash2(i, 4) * (chamberTop(r) - PLATE.top) * 0.9 : PLATE.top + 0.002;
      const rr = onWall ? PLATE.r - 0.006 : r;
      const grow = Math.min(1, Math.max(0, kv * 1.6 - hash2(i, 5) * 0.6));
      const s = (0.004 + 0.007 * hash2(i, 6)) * grow;
      _q.setFromAxisAngle(_p.set(hash2(i, 7) - 0.5, 1, hash2(i, 8) - 0.5).normalize(), hash2(i, 9) * 3);
      _m.compose(_p.set(Math.cos(a) * rr, y, Math.sin(a) * rr), _q, _s.set(s, s * (0.6 + hash2(i, 10)), s));
      kr.setMatrixAt(i, _m);
    }
    kr.instanceMatrix.needsUpdate = true;
    if (filmRef.current) {
      const b = track.bio(t);
      filmRef.current.visible = b > 0.01;
      filmRef.current.scale.set(1, Math.max(0.01, b), 1);
      filmRef.current.position.y = (1 - Math.max(0.01, b)) * PLATE.top;
    }
    if (waterRef.current) {
      const l = track.level(t);
      const top = l >= 0.999 ? 0.1 : PLATE.top + l * 0.09;
      waterRef.current.position.y = PLATE.top;
      waterRef.current.scale.set(1, Math.max(0.001, top - PLATE.top), 1);
      waterRef.current.visible = l > 0.01 && track.cut(t) > 0.01;
    }
    // jets: straight from clean nozzles, crooked (or none) from clogged ones
    const jets = jetRef.current!;
    const w = track.water(t);
    const hot = track.hot(t);
    for (let i = 0; i < N; i++) {
      const n = NOZZLES[i];
      const dir = n.clogged ? _p.copy(DOWN).lerp(n.dir, clog).normalize().clone() : DOWN.clone().add(new THREE.Vector3((hash2(i, 3) - 0.5) * 0.05, 0, (hash2(i, 4) - 0.5) * 0.05)).normalize();
      const blocked = n.clogged && hash2(i, 11) < 0.35 ? clog : 0;
      for (let k = 0; k < K; k++) {
        const id = i * K + k;
        const u = (k / K + t * 1.9 + hash2(i, 5)) % 1;
        const L = 3.2;
        _p.copy(n.p).addScaledVector(dir, u * L);
        _p.y -= 0.25 * u * u * L;
        const sc = 0.0032 * w * (1 - blocked) * (1 - Math.max(0, (u - 0.85) / 0.15));
        _q.setFromUnitVectors(UP, dir);
        _m.compose(_p, _q, _s.set(sc, sc * 9, sc));
        jets.setMatrixAt(id, _m);
        // a few dark biofilm flakes torn out during the shower
        const flake = n.clogged && k % 5 === 0 && t > 27.6 && t < 41.5;
        _c.set(flake ? '#3a3020' : '#e6f6ff').lerp(new THREE.Color('#ffd2b0'), flake ? 0 : hot * 0.5);
        jets.setColorAt(id, _c);
      }
    }
    jets.instanceMatrix.needsUpdate = true;
    if (jets.instanceColor) jets.instanceColor.needsUpdate = true;
    // finger rubbing the rubber nozzles (finger lies along x, pad facing up)
    const fv = track.finger(t);
    mats.skin.opacity = fv;
    if (fingerRef.current) {
      fingerRef.current.visible = fv > 0.002;
      const rub = Math.sin((t - 49.6) * 7) * 0.12;
      fingerRef.current.position.set(-0.15 + 0.1 * (1 - fv), PLATE.bottom - NUB.len - 0.035 - 0.15 * (1 - fv), 0.12 + rub);
    }
    // descaling: CO₂ bubbles from the acid dissolving the limescale
    const bub = bubRef.current!;
    const dv = track.descale(t);
    for (let i = 0; i < NB; i++) {
      const life = (hash2(i, 1) + t * 0.8) % 1;
      const r = Math.sqrt(hash2(i, 2)) * (PLATE.r - 0.03);
      const a = hash2(i, 3) * Math.PI * 2;
      const y = PLATE.top + 0.004 + life * 0.06;
      const s = (0.003 + 0.004 * hash2(i, 4)) * dv * Math.sin(Math.PI * life);
      _m.compose(_p.set(Math.cos(a) * r, y, Math.sin(a) * r), _q.identity(), _s.setScalar(s));
      bub.setMatrixAt(i, _m);
    }
    bub.instanceMatrix.needsUpdate = true;
  });

  // finger: papercut finger (cm) → head units (≈ 0.046 per cm), axis along −x, pad up
  const fingerQuat = useMemo(() => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0))), []);

  return (
    <group name="ShowerHead" position={HEAD}>
      <mesh name="Pipe" material={mats.pipe} position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 3.8, 24]} />
      </mesh>
      <mesh name="Housing" geometry={geo.housing} material={mats.chrome} castShadow />
      <mesh name="FacePlate" geometry={geo.plate} material={mats.plate} />
      <instancedMesh ref={nubRef} args={[geo.nub, mats.nub, N]} frustumCulled={false} />
      <instancedMesh ref={plugRef} args={[undefined, mats.plug, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 10]} />
      </instancedMesh>
      <instancedMesh ref={kalkRef} args={[undefined, mats.kalk, NK]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <mesh ref={filmRef} name="Biofilm" geometry={geo.film} material={mats.film} />
      <mesh ref={waterRef} name="ChamberWater" geometry={geo.water} material={mats.water} renderOrder={5} />
      <instancedMesh ref={jetRef} args={[undefined, mats.drop, N * K]} frustumCulled={false} renderOrder={6}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <instancedMesh ref={bubRef} args={[undefined, mats.bubble, NB]} frustumCulled={false} renderOrder={7}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <group ref={fingerRef} quaternion={fingerQuat}>
        <mesh geometry={geo.finger} material={mats.skin} scale={0.046} position={[0, -6.4 * 0.046, 0]} />
      </group>
      <Steam origin={[0, -0.5, 0]} intensity={(t) => track.hot(t) * 0.9} count={120} lifetime={2.6} riseSpeed={0.35} spread={0.5} size={0.5} opacity={0.08} />
    </group>
  );
}
