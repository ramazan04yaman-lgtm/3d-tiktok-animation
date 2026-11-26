import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { JOINT, RIM } from './script';
import * as track from './script';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const L = JOINT.x1 - JOINT.x0;

function tileTexture(grout = '#c9ced3', tile = '#f7f8f8', n = 4) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = grout;
  g.fillRect(0, 0, 1024, 1024);
  const s = 1024 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
      gr.addColorStop(0, tile);
      gr.addColorStop(1, tile === '#d8d3ca' ? '#cfc9bf' : '#eceeef');
      g.fillStyle = gr;
      g.fillRect(i * s + 5, j * s + 5, s - 10, s - 10);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** joint bead along +x (length 1), profile in the y–z corner; `rough` = old convex bead */
function beadGeo(rough: boolean) {
  const s = new THREE.Shape();
  const a = 0.15;
  s.moveTo(0, 0);
  s.lineTo(0, a);
  if (rough) s.quadraticCurveTo(0.14, 0.14, a + 0.02, 0);
  else s.quadraticCurveTo(0.035, 0.035, a, 0);
  s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 16 });
  // shape (u → z, v → y), extrusion → x
  g.rotateY(-Math.PI / 2);
  g.translate(1, 0, 0);
  g.computeVertexNormals();
  return g;
}

export function Bathroom() {
  const geo = useMemo(() => ({ old: beadGeo(true), fresh: beadGeo(false) }), []);
  const mats = useMemo(() => {
    const wallTex = tileTexture('#8f969c', '#d8d3ca', 4);
    wallTex.repeat.set(3, 2.5);
    const sideTex = tileTexture('#8f969c', '#d8d3ca', 4);
    sideTex.repeat.set(3, 2.5);
    const floorTex = tileTexture('#9aa0a6', '#c9cdd1', 3);
    floorTex.repeat.set(4, 4);
    return {
      wall: new THREE.MeshPhysicalMaterial({ map: wallTex, roughness: 0.18, clearcoat: 0.6 }),
      side: new THREE.MeshPhysicalMaterial({ map: sideTex, roughness: 0.18, clearcoat: 0.6 }),
      floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }),
      tray: new THREE.MeshPhysicalMaterial({ color: '#fbfbfb', roughness: 0.12, clearcoat: 1 }),
      chrome: new THREE.MeshPhysicalMaterial({ color: '#e6e9ec', metalness: 1, roughness: 0.1 }),
      oldBead: new THREE.MeshPhysicalMaterial({ color: '#e4e2d8', roughness: 0.45, clearcoat: 0.2 }),
      freshBead: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.15, clearcoat: 0.8 }),
      wetBead: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.35, clearcoat: 0.2 }),
      mould: new THREE.MeshStandardMaterial({ color: '#23271c', roughness: 0.9 }),
      water: new THREE.MeshPhysicalMaterial({ color: '#dff1ff', roughness: 0.02, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.75 }),
      soap: new THREE.MeshStandardMaterial({ color: '#f2efe4', roughness: 0.9, transparent: true, opacity: 0.6, depthWrite: false }),
      tape: new THREE.MeshStandardMaterial({ color: '#2f7fd6', roughness: 0.7 }),
      rod: new THREE.MeshStandardMaterial({ color: '#b8c4cf', roughness: 0.8 }),
      sponge: new THREE.MeshStandardMaterial({ color: '#ffd23a', roughness: 0.9 }),
      spongeTop: new THREE.MeshStandardMaterial({ color: '#3cae5a', roughness: 0.9 }),
      yellow: new THREE.MeshPhysicalMaterial({ color: '#ffc21a', roughness: 0.4, clearcoat: 0.6 }),
      steel: new THREE.MeshPhysicalMaterial({ color: '#cfd5da', metalness: 1, roughness: 0.2 }),
      cloth: new THREE.MeshStandardMaterial({ color: '#7fc0ff', roughness: 0.95 }),
      dark: new THREE.MeshPhysicalMaterial({ color: '#2a2f36', roughness: 0.4, clearcoat: 0.4 }),
      red: new THREE.MeshPhysicalMaterial({ color: '#e5383b', roughness: 0.4, clearcoat: 0.6 }),
      orange: new THREE.MeshPhysicalMaterial({ color: '#ff8a1a', roughness: 0.4, clearcoat: 0.6 }),
      cart: new THREE.MeshPhysicalMaterial({ color: '#f4f4f4', roughness: 0.4 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#1b1e22', roughness: 0.7 }),
    };
  }, []);

  const oldRef = useRef<THREE.Mesh>(null);
  const freshRef = useRef<THREE.Mesh>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const mouldRef = useRef<THREE.InstancedMesh>(null);
  const dropRef = useRef<THREE.InstancedMesh>(null);
  const soapRef = useRef<THREE.InstancedMesh>(null);
  const tapeW = useRef<THREE.Mesh>(null);
  const tapeT = useRef<THREE.Mesh>(null);
  const spongeRef = useRef<THREE.Group>(null);
  const cutterRef = useRef<THREE.Group>(null);
  const clothRef = useRef<THREE.Group>(null);
  const gunRef = useRef<THREE.Group>(null);
  const smoothRef = useRef<THREE.Group>(null);
  const squeegeeRef = useRef<THREE.Group>(null);
  const NM = 900, ND = 40, NS = 22;

  useTimelineFrame((t) => {
    // old bead: removed from the left by the cutter
    const c = track.cut(t);
    const done = t > 35.5;
    if (oldRef.current) {
      oldRef.current.visible = !done;
      oldRef.current.position.x = JOINT.x0 + c * L;
      oldRef.current.scale.x = Math.max(0.001, (1 - c) * L);
    }
    // mould spots on the old bead (and on the new one when it ages)
    const mm = mouldRef.current!;
    const mo = track.mouldOld(t);
    const ag = track.aging(t);
    for (let i = 0; i < NM; i++) {
      const u = hash2(i, 1);
      const x = JOINT.x0 + u * L;
      const onOld = !done && x > JOINT.x0 + c * L;
      const amount = onOld ? mo : t > 62 ? 0.35 * ag : 0;
      const show = hash2(i, 2) < amount;
      // point on the bead surface (quadratic profile from the wall to the tray)
      const sb = 0.08 + 0.84 * hash2(i, 3);
      const cu = onOld ? 0.14 : 0.035, end = onOld ? 0.17 : 0.15;
      const pu = 2 * sb * (1 - sb) * cu + sb * sb * end;
      const pv = (1 - sb) * (1 - sb) * 0.15 + 2 * sb * (1 - sb) * cu;
      // spots grow in clusters
      const cl = Math.floor(hash2(i, 12) * 14);
      const xc = JOINT.x0 + hash2(cl, 13) * L;
      const xx = hash2(i, 14) < 0.65 ? xc + (hash2(i, 15) - 0.5) * 0.9 : x;
      _p.set(Math.min(JOINT.x1, Math.max(JOINT.x0, xx)), JOINT.y + pv + 0.004, JOINT.z + pu + 0.004);
      const sz = show && (!onOld || _p.x > JOINT.x0 + c * L) ? 0.005 + 0.014 * hash2(i, 4) * (onOld ? 1 : 0.6) : 0;
      _q.setFromEuler(_e.set(0, 0, 0));
      _m.compose(_p, _q, _s.set(sz * 1.6, sz, sz));
      mm.setMatrixAt(i, _m);
    }
    mm.instanceMatrix.needsUpdate = true;
    // new bead: injected from the left, then smoothed (rough → concave)
    const b = track.bead(t);
    const sm = track.smooth(t);
    if (freshRef.current) {
      freshRef.current.visible = b > 0.001;
      freshRef.current.scale.x = Math.max(0.001, b * L);
      freshRef.current.material = sm > 0.5 || t > 53.2 ? mats.freshBead : mats.wetBead;
      freshRef.current.geometry = sm > 0.5 || t > 53.2 ? geo.fresh : geo.old;
    }
    mats.freshBead.color.set('#ffffff').lerp(new THREE.Color('#e9dfb8'), 0.8 * ag);
    // backing rod (pressed in from the left)
    const rd = track.rodMain(t);
    if (rodRef.current) {
      rodRef.current.visible = rd > 0.001 && t < 49;
      rodRef.current.scale.y = Math.max(0.001, rd * L);
    }
    // water drops + soap film
    const dm = dropRef.current!;
    const dk = track.drops(t);
    for (let i = 0; i < ND; i++) {
      const x = JOINT.x0 + 0.5 + hash2(i, 5) * (L - 1);
      const onWall = i % 2 === 0;
      const r = (0.025 + 0.035 * hash2(i, 6)) * Math.min(1, Math.max(0, dk * 1.5 - hash2(i, 7) * 0.5));
      if (onWall) _p.set(x, RIM + 0.2 + hash2(i, 8) * 1.2, 0.012);
      else _p.set(x, RIM + 0.01, 0.2 + hash2(i, 8) * 0.6);
      _m.compose(_p, _q.identity(), onWall ? _s.set(r, r * 1.3, r * 0.45) : _s.set(r, r * 0.45, r));
      dm.setMatrixAt(i, _m);
    }
    dm.instanceMatrix.needsUpdate = true;
    const so = soapRef.current!;
    const sk = track.soap(t);
    for (let i = 0; i < NS; i++) {
      const x = JOINT.x0 + 0.4 + hash2(i, 9) * (L - 0.8);
      const r = (0.12 + 0.18 * hash2(i, 10)) * sk;
      _m.compose(_p.set(x, RIM + 0.004, 0.16 + 0.25 * hash2(i, 11)), _q.identity(), _s.set(r, 0.004, r * 0.6));
      so.setMatrixAt(i, _m);
    }
    so.instanceMatrix.needsUpdate = true;
    // masking tape on wall and tray
    const ti = track.tapeIn(t), to = track.tapeOut(t);
    for (const [ref, isWall] of [[tapeW, true], [tapeT, false]] as const) {
      const m = ref.current;
      if (!m) continue;
      m.visible = ti > 0.001 && to < 0.999;
      m.scale.x = Math.max(0.001, ti * L);
      m.position.y = isWall ? RIM + 0.28 + to * 0.6 : RIM + 0.004 + to * 0.4;
      m.rotation.x = isWall ? -to * 0.6 : -Math.PI / 2 + to * 0.8;
    }
    // tools
    const sp = track.sponge(t);
    if (spongeRef.current) {
      spongeRef.current.visible = sp > 0.01;
      spongeRef.current.position.set(5.0 + 0.35 * Math.sin(t * 7), RIM + 0.17 + (1 - sp) * 1.2, 0.24);
    }
    const cu = track.cutter(t);
    if (cutterRef.current) {
      cutterRef.current.visible = cu > 0.01;
      cutterRef.current.position.set(JOINT.x0 + c * L, RIM + 0.12 + (1 - cu) * 1.2, 0.12);
    }
    const cl = track.cloth(t);
    if (clothRef.current) {
      clothRef.current.visible = cl > 0.01;
      clothRef.current.position.set(JOINT.x0 + 0.6 + ((t - 35.6) / 3) * (L - 1.2), RIM + 0.12 + (1 - cl) * 1.2, 0.18);
    }
    const gu = track.gun(t);
    if (gunRef.current) {
      gunRef.current.visible = gu > 0.01;
      gunRef.current.position.set(JOINT.x0 + b * L, RIM + 0.12 + (1 - gu) * 1.5, 0.12);
    }
    const so2 = track.smoother(t);
    if (smoothRef.current) {
      smoothRef.current.visible = so2 > 0.01;
      smoothRef.current.position.set(JOINT.x0 + sm * L, RIM + 0.08 + (1 - so2) * 1.2, 0.08);
    }
    const sq = track.squeegee(t);
    if (squeegeeRef.current) {
      squeegeeRef.current.visible = sq > 0.01;
      const k = Math.min(1, Math.max(0, (t - 58.6) / 2.8));
      squeegeeRef.current.position.set(3.0 + 3 * k, RIM + 6.5 - 4.5 * ((k * 3) % 1) + (1 - sq) * 1.0, 0.15 + (1 - sq) * 1.0);
    }
  });

  return (
    <group name="Bathroom">
      {/* walls with tiles, floor */}
      <mesh material={mats.wall} position={[6, 6.5, -0.3]} receiveShadow>
        <boxGeometry args={[12, 13, 0.6]} />
      </mesh>
      <mesh material={mats.side} position={[-0.3, 6.5, 6]} rotation-y={Math.PI / 2} receiveShadow>
        <boxGeometry args={[12, 13, 0.6]} />
      </mesh>
      <mesh material={mats.floor} rotation-x={-Math.PI / 2} position={[6, 0.002, 6]} receiveShadow>
        <planeGeometry args={[12, 12]} />
      </mesh>
      {/* shower tray: rim + basin + drain */}
      <RoundedBox args={[9.0, RIM, 9.0]} radius={0.08} smoothness={3} position={[4.55, RIM / 2, 4.55]} material={mats.tray} castShadow receiveShadow />
      <mesh material={mats.chrome} position={[4.55, RIM + 0.003, 4.8]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.45, 40]} />
      </mesh>
      {/* mixer + shower rail on the back wall */}
      <mesh material={mats.chrome} position={[7.4, 9.0, 0.2]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 32]} />
      </mesh>
      <mesh material={mats.chrome} position={[7.4, 11.0, 0.15]}>
        <cylinderGeometry args={[0.07, 0.07, 6, 16]} />
      </mesh>
      {/* joints */}
      <mesh ref={oldRef} geometry={geo.old} material={mats.oldBead} position={[JOINT.x0, JOINT.y, JOINT.z]} castShadow />
      <mesh ref={freshRef} geometry={geo.fresh} material={mats.freshBead} position={[JOINT.x0, JOINT.y, JOINT.z]} castShadow />
      <mesh ref={rodRef} material={mats.rod} position={[JOINT.x0, JOINT.y - 0.05, 0.06]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 1, 12]} />
      </mesh>
      <group position={[0, 0, 0]}>
        <instancedMesh ref={mouldRef} args={[undefined, mats.mould, NM]} frustumCulled={false}>
          <sphereGeometry args={[1, 10, 8]} />
        </instancedMesh>
      </group>
      <instancedMesh ref={dropRef} args={[undefined, mats.water, ND]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <instancedMesh ref={soapRef} args={[undefined, mats.soap, NS]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 20]} />
      </instancedMesh>
      {/* masking tape: on the tiles above and on the tray in front of the joint */}
      <mesh ref={tapeW} material={mats.tape} position={[JOINT.x0, RIM + 0.28, 0.006]} geometry={useMemo(() => new THREE.PlaneGeometry(1, 0.22).translate(0.5, 0, 0), [])} />
      <mesh ref={tapeT} material={mats.tape} position={[JOINT.x0, RIM + 0.004, 0.3]} geometry={useMemo(() => new THREE.PlaneGeometry(1, 0.22).translate(0.5, 0, 0), [])} />

      {/* tools */}
      <group ref={spongeRef}>
        <mesh material={mats.sponge} position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.6, 0.2, 0.36]} />
        </mesh>
        <mesh material={mats.spongeTop} position={[0, 0.13, 0]}>
          <boxGeometry args={[0.6, 0.06, 0.36]} />
        </mesh>
      </group>
      <group ref={cutterRef} rotation={[0.5, 0, -0.5]}>
        <mesh material={mats.yellow} position={[-0.35, 0.3, 0]} rotation-z={-0.6} castShadow>
          <boxGeometry args={[0.18, 0.9, 0.12]} />
        </mesh>
        <mesh material={mats.steel} position={[0, 0, 0]} rotation-z={-0.6}>
          <boxGeometry args={[0.1, 0.3, 0.015]} />
        </mesh>
      </group>
      <group ref={clothRef}>
        <RoundedBox args={[0.9, 0.12, 0.6]} radius={0.05} smoothness={3} material={mats.cloth} castShadow />
      </group>
      <group ref={gunRef} rotation={[0.6, 0, 0.5]} scale={0.55}>
        <mesh material={mats.cart} position={[-0.9, 0.55, 0]} rotation-z={-1.0} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 1.6, 24]} />
        </mesh>
        <mesh material={mats.cart} position={[-0.12, 0.08, 0]} rotation-z={-1.0}>
          <coneGeometry args={[0.07, 0.4, 16]} />
        </mesh>
        <mesh material={mats.red} position={[-1.7, 0.5, 0]} rotation-z={-1.0}>
          <boxGeometry args={[0.12, 0.7, 0.12]} />
        </mesh>
        <mesh material={mats.dark} position={[-1.45, 0.95, 0]} rotation-z={-1.0}>
          <boxGeometry args={[0.1, 1.6, 0.08]} />
        </mesh>
      </group>
      <group ref={smoothRef} rotation={[0.8, 0, 0]}>
        <RoundedBox args={[0.5, 0.06, 0.4]} radius={0.02} smoothness={3} material={mats.orange} castShadow />
      </group>
      <group ref={squeegeeRef}>
        <mesh material={mats.rubber} position={[0, 0, 0.02]}>
          <boxGeometry args={[1.8, 0.12, 0.08]} />
        </mesh>
        <mesh material={mats.dark} position={[0, 0.14, 0.05]}>
          <boxGeometry args={[1.8, 0.18, 0.12]} />
        </mesh>
        <mesh material={mats.dark} position={[0, 0.7, 0.25]} rotation-x={-0.4}>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 12]} />
        </mesh>
      </group>
    </group>
  );
}
