import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { BLOCK } from './script';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** profile (u → z towards the room, v → y) extruded along x over the block length */
const LEN = 2.2;
function prism(pts: [number, number][], len = LEN) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(([u, v]) => s.lineTo(u, v));
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 20 });
  g.rotateY(-Math.PI / 2);
  g.translate(len / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}
function shapePrism(s: THREE.Shape, len = LEN) {
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 24 });
  g.rotateY(-Math.PI / 2);
  g.translate(len / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}
const box = (u0: number, u1: number, v0: number, v1: number): [number, number][] => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

/**
 * Magnified section of the joint: wall + tile on the left (u < 0), tray on the right (u > 0.3),
 * the joint gap between them. Modes: mould growing in, wrong (3-sided → tears, water behind),
 * right (backing rod, 2-sided, stretches).
 */
export function Section() {
  const geo = useMemo(() => {
    // wrong silicone: fills the gap down to the bottom (3 flanks), split in two halves for the tear
    const leftHalf = prism([[0, -0.6], [0.15, -0.6], [0.15, 0.03], [0, 0.06]]);
    const rightHalf = prism([[0.15, -0.6], [0.3, -0.6], [0.3, 0.03], [0.15, 0.03]]);
    // right silicone: only above the rod, concave top, touching tile face and tray edge
    const r = new THREE.Shape();
    r.moveTo(0, -0.16);
    r.quadraticCurveTo(0.15, -0.06, 0.3, -0.16);
    r.lineTo(0.3, 0.0);
    r.quadraticCurveTo(0.15, -0.04, 0, 0.04);
    r.lineTo(0, -0.16);
    return {
      wall: prism(box(-1.0, -0.36, -1.0, 1.1)),
      adhesive: prism(box(-0.36, -0.22, -0.05, 1.1)),
      tile: prism(box(-0.22, 0, 0.0, 1.1)),
      bed: prism(box(-1.0, 0.3, -1.0, -0.6)),
      trayTop: prism(box(0.3, 1.3, -0.08, 0)),
      trayEdge: prism(box(0.3, 0.38, -0.6, 0)),
      support: prism(box(0.38, 1.3, -1.0, -0.62)),
      leftHalf,
      rightHalf,
      right: shapePrism(r),
      water: prism(box(-0.36, -0.22, -0.6, 0.5)),
      gapWater: prism(box(0.0, 0.3, -0.6, -0.3)),
      frame: new THREE.EdgesGeometry(new THREE.BoxGeometry(LEN, 2.1, 2.3)),
    };
  }, []);
  const mats = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({ color: '#c98f6b', roughness: 0.95, transparent: true }),
    adhesive: new THREE.MeshStandardMaterial({ color: '#6f7a85', roughness: 0.9, transparent: true }),
    tile: new THREE.MeshPhysicalMaterial({ color: '#f7f8f8', roughness: 0.15, clearcoat: 0.8, transparent: true }),
    bed: new THREE.MeshStandardMaterial({ color: '#8d8f91', roughness: 0.95, transparent: true }),
    tray: new THREE.MeshPhysicalMaterial({ color: '#fbfbfb', roughness: 0.12, clearcoat: 1, transparent: true }),
    support: new THREE.MeshStandardMaterial({ color: '#5d6670', roughness: 0.8, transparent: true }),
    silicone: new THREE.MeshPhysicalMaterial({ color: '#dff0ff', roughness: 0.3, clearcoat: 0.5, transparent: true }),
    hypha: new THREE.MeshStandardMaterial({ color: '#1d2018', roughness: 0.8, transparent: true }),
    water: new THREE.MeshPhysicalMaterial({ color: '#3f8fd6', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8 }),
    rod: new THREE.MeshStandardMaterial({ color: '#8fb4d6', roughness: 0.85, transparent: true }),
    flankBad: new THREE.MeshBasicMaterial({ color: '#e5383b', toneMapped: false, transparent: true }),
    flankGood: new THREE.MeshBasicMaterial({ color: '#1fae5b', toneMapped: false, transparent: true }),
    frame: new THREE.LineBasicMaterial({ color: '#1f8fff', transparent: true }),
  }), []);
  const g = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const good = useRef<THREE.Mesh>(null);
  const rod = useRef<THREE.Mesh>(null);
  const water = useRef<THREE.Mesh>(null);
  const gapWater = useRef<THREE.Mesh>(null);
  const hyphae = useRef<THREE.InstancedMesh>(null);
  const flanksBad = useRef<THREE.Group>(null);
  const flanksGood = useRef<THREE.Group>(null);
  const NH = 60;
  useTimelineFrame((t) => {
    const v = track.block(t);
    if (!g.current) return;
    g.current.visible = v > 0.002;
    g.current.scale.setScalar(0.6 + 0.4 * v);
    for (const m of Object.values(mats)) {
      (m as THREE.Material).opacity = v * ((m as THREE.Material) === mats.water ? 0.8 : 1);
    }
    const mode = track.blockMode(t);
    // tray movement: drops in the wrong mode, flexes in the right mode
    const dy = mode === 'wrong' ? -0.1 * track.drop(t) : mode === 'right' ? -0.1 * track.flex(t) : 0;
    if (tray.current) tray.current.position.y = dy;
    const wrongish = mode !== 'right';
    if (left.current && right.current) {
      left.current.visible = wrongish;
      right.current.visible = wrongish;
      const tr = mode === 'wrong' ? track.tear(t) : 0;
      // the right half stays glued to the tray edge and the bottom: a crack opens in the middle
      right.current.position.set(0, dy, 0);
      right.current.position.z = 0.03 * tr;
      left.current.position.z = -0.0 * tr;
    }
    if (good.current && rod.current) {
      good.current.visible = mode === 'right' && track.fillRight(t) > 0.01;
      good.current.scale.set(1, Math.max(0.01, track.fillRight(t)), 1);
      // stretches with the tray: shear the right side down
      good.current.position.y = dy * 0.5;
      rod.current.visible = mode === 'right' && track.rodIn(t) > 0.01;
      rod.current.position.y = -0.27 + (1 - track.rodIn(t)) * 0.9;
    }
    if (water.current && gapWater.current) {
      const w = mode === 'wrong' ? track.behind(t) : 0;
      water.current.visible = w > 0.01;
      water.current.scale.y = Math.max(0.01, w);
      gapWater.current.visible = w > 0.01;
      gapWater.current.scale.y = Math.max(0.01, w);
    }
    if (flanksBad.current) flanksBad.current.visible = mode === 'wrong' && t > 14.0 && t < 17.4;
    if (flanksGood.current) flanksGood.current.visible = mode === 'right' && t > 43.2;
    // mould hyphae growing down into the silicone (hook) / behind the tile (wrong)
    const hm = hyphae.current!;
    const hk = mode === 'mould' ? track.hyphae(t) : mode === 'wrong' ? track.behind(t) : 0;
    for (let i = 0; i < NH; i++) {
      const inSil = mode === 'mould' || i % 2 === 0;
      const x = -LEN / 2 - 0.006 - 0.01 * hash2(i, 1);
      const len = (0.1 + 0.4 * hash2(i, 2)) * hk;
      if (inSil) _p.set(x, 0.04 - len / 2, 0.03 + 0.24 * hash2(i, 3));
      else _p.set(x, 0.3 - len / 2 - 0.5 * hash2(i, 4), -0.29 + 0.05 * hash2(i, 5));
      _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (hash2(i, 6) - 0.5) * 0.6);
      _m.compose(_p, _q, _s.set(1, Math.max(0.001, len), 1));
      hm.setMatrixAt(i, _m);
    }
    hm.instanceMatrix.needsUpdate = true;
  });
  const flank = (u: number, v: number, w: number, h: number, mat: THREE.Material, key: string) => (
    <mesh key={key} material={mat} position={[0, v, u]}>
      <boxGeometry args={[LEN + 0.02, h, w]} />
    </mesh>
  );
  return (
    <group ref={g} position={BLOCK} rotation-y={Math.PI / 2}>
      <lineSegments geometry={geo.frame} material={mats.frame} position={[0, 0.05, 0.15]} />
      <mesh geometry={geo.wall} material={mats.wall} />
      <mesh geometry={geo.adhesive} material={mats.adhesive} />
      <mesh geometry={geo.tile} material={mats.tile} />
      <mesh geometry={geo.bed} material={mats.bed} />
      <group ref={tray}>
        <mesh geometry={geo.trayTop} material={mats.tray} />
        <mesh geometry={geo.trayEdge} material={mats.tray} />
      </group>
      <mesh geometry={geo.support} material={mats.support} />
      <mesh ref={left} geometry={geo.leftHalf} material={mats.silicone} />
      <mesh ref={right} geometry={geo.rightHalf} material={mats.silicone} />
      <mesh ref={good} geometry={geo.right} material={mats.silicone} />
      <mesh ref={rod} material={mats.rod} position={[0, -0.27, 0.15]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.13, 0.13, LEN, 32]} />
      </mesh>
      <mesh ref={water} geometry={geo.water} material={mats.water} />
      <mesh ref={gapWater} geometry={geo.gapWater} material={mats.water} position={[0, 0, 0]} />
      <instancedMesh ref={hyphae} args={[undefined, mats.hypha, NH]} frustumCulled={false}>
        <cylinderGeometry args={[0.014, 0.022, 1, 6]} />
      </instancedMesh>
      {/* adhesion flanks: 3 red (wrong) / 2 green (right) */}
      <group ref={flanksBad}>
        {flank(0.01, -0.27, 0.03, 0.66, mats.flankBad, 'a')}
        {flank(0.29, -0.27, 0.03, 0.66, mats.flankBad, 'b')}
        {flank(0.15, -0.6, 0.3, 0.03, mats.flankBad, 'c')}
      </group>
      <group ref={flanksGood}>
        {flank(0.01, -0.06, 0.03, 0.2, mats.flankGood, 'a')}
        {flank(0.29, -0.08, 0.03, 0.18, mats.flankGood, 'b')}
      </group>
    </group>
  );
}
