import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { DISPENSER, HUB_LOW, HUB_UP, PUMP, SOFTENER, SUMP } from './script';
import * as track from './script';

/** tub interior */
export const TUB = { x0: -2.2, x1: 2.2, y0: 0.8, y1: 6.4, z0: -2.1, z1: 2.1 };
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** pipes (also used by the water-flow particles) */
export const PIPES = {
  inlet: new THREE.CatmullRomCurve3([v(-2.2, 0.35, -2.9), v(-2.0, 0.35, -2.3), v(-1.7, 0.42, -1.7), v(SOFTENER[0], SOFTENER[1], SOFTENER[2])]),
  softToSump: new THREE.CatmullRomCurve3([v(SOFTENER[0] + 0.3, SOFTENER[1] + 0.05, SOFTENER[2] + 0.2), v(-0.8, 0.5, -0.6), v(-0.3, 0.6, 0.1), v(SUMP[0], SUMP[1], SUMP[2])]),
  sumpToPump: new THREE.CatmullRomCurve3([v(SUMP[0], 0.45, SUMP[2]), v(0.25, 0.36, 0.25), v(PUMP[0] - 0.2, PUMP[1], PUMP[2])]),
  toLower: new THREE.CatmullRomCurve3([v(PUMP[0], PUMP[1] + 0.15, PUMP[2]), v(0.35, 0.75, 0.15), v(0.08, 0.92, 0.04), v(HUB_LOW[0], HUB_LOW[1] - 0.05, HUB_LOW[2])]),
  toUpper: new THREE.CatmullRomCurve3([v(PUMP[0] + 0.2, PUMP[1], PUMP[2] - 0.2), v(0.9, 0.45, -1.6), v(0.3, 0.95, -2.05), v(0.0, 2.2, -2.06), v(0.0, 3.55, -2.06), v(0.0, HUB_UP[1], -1.4), v(HUB_UP[0], HUB_UP[1], HUB_UP[2])]),
};

function plateGeo() {
  const p: THREE.Vector2[] = [];
  const k: [number, number][] = [[0, 0], [0.18, 0], [0.22, 0.015], [0.3, 0.03], [0.44, 0.07], [0.46, 0.085], [0.44, 0.09], [0.3, 0.05], [0.22, 0.035], [0, 0.025]];
  k.forEach(([r, y]) => p.push(new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(p, 48);
}
function cupGeo() {
  const k: [number, number][] = [[0, 0], [0.16, 0], [0.2, 0.04], [0.21, 0.36], [0.19, 0.36], [0.18, 0.05], [0, 0.04]];
  return new THREE.LatheGeometry(k.map(([r, y]) => new THREE.Vector2(r, y)), 32);
}
function glassGeo() {
  const k: [number, number][] = [[0, 0], [0.13, 0], [0.14, 0.03], [0.17, 0.5], [0.16, 0.5], [0.12, 0.04], [0, 0.035]];
  return new THREE.LatheGeometry(k.map(([r, y]) => new THREE.Vector2(r, y)), 32);
}
function armGeo(len: number) {
  const g = new THREE.BoxGeometry(len, 0.07, 0.16);
  const hub = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 24);
  return { g, hub };
}
/** wire rack: tubes along x and z on a rectangle */
function rackGeo(y: number, h: number) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (a: THREE.Vector3, b: THREE.Vector3) => {
    const c = new THREE.LineCurve3(a, b);
    parts.push(new THREE.TubeGeometry(c, 1, 0.018, 6).toNonIndexed());
  };
  const x0 = TUB.x0 + 0.12, x1 = TUB.x1 - 0.12, z0 = TUB.z0 + 0.12, z1 = TUB.z1 - 0.15;
  for (let x = x0; x <= x1 + 1e-6; x += 0.32) add(v(x, y, z0), v(x, y, z1));
  for (let z = z0; z <= z1 + 1e-6; z += 0.32) add(v(x0, y, z), v(x1, y, z));
  for (const yy of [y, y + h]) {
    add(v(x0, yy, z0), v(x1, yy, z0));
    add(v(x0, yy, z1), v(x1, yy, z1));
    add(v(x0, yy, z0), v(x0, yy, z1));
    add(v(x1, yy, z0), v(x1, yy, z1));
  }
  for (let x = x0; x <= x1 + 1e-6; x += 0.32) {
    add(v(x, y, z0), v(x, y + h, z0));
    add(v(x, y, z1), v(x, y + h, z1));
  }
  // plate tines in the lower rack
  return parts;
}

export function Machine() {
  const geo = useMemo(() => {
    return {
      lowerRack: mergeGeometries(rackGeo(1.35, 0.5)),
      upperRack: mergeGeometries(rackGeo(3.95, 0.45)),
      plate: plateGeo(),
      cup: cupGeo(),
      glass: glassGeo(),
      armLow: armGeo(3.4),
      armUp: armGeo(2.8),
    };
  }, []);
  const mats = useMemo(() => {
    const steel = new THREE.MeshPhysicalMaterial({ color: '#c9ced4', metalness: 0.9, roughness: 0.28, clearcoat: 0.3, side: THREE.BackSide });
    const steelOut = new THREE.MeshPhysicalMaterial({ color: '#2b2f35', metalness: 0.6, roughness: 0.35, clearcoat: 0.6 });
    const front = createXRayMaterial('#9fd0ff');
    front.uniforms.uBase.value = 0.03;
    const frontSolid = new THREE.MeshPhysicalMaterial({ color: '#30353c', metalness: 0.7, roughness: 0.3, clearcoat: 0.8, transparent: true });
    const wire = new THREE.MeshPhysicalMaterial({ color: '#d8dde2', roughness: 0.3, clearcoat: 0.8 });
    const plastic = new THREE.MeshPhysicalMaterial({ color: '#8a9099', roughness: 0.4, clearcoat: 0.4 });
    const ceramic = new THREE.MeshPhysicalMaterial({ color: '#f2f0ea', roughness: 0.18, clearcoat: 1, side: THREE.DoubleSide });
    const cupM = new THREE.MeshPhysicalMaterial({ color: '#3d6fa8', roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#e9f4ff', roughness: 0.03, transmission: 0.0, transparent: true, opacity: 0.32, metalness: 0.1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const dirt = new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: 0.3 });
    const heater = new THREE.MeshPhysicalMaterial({ color: '#7a7f86', metalness: 0.8, roughness: 0.35, emissive: '#ff4a10', emissiveIntensity: 0 });
    const resin = new THREE.MeshPhysicalMaterial({ color: '#6f6a5e', roughness: 0.4, transparent: true, opacity: 0.55 });
    const sieve = new THREE.MeshPhysicalMaterial({ color: '#b8c0c8', metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.8, emissive: '#2a8cff', emissiveIntensity: 0 });
    const water = new THREE.MeshPhysicalMaterial({ color: '#4fa3dc', roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
    const pipe = new THREE.MeshPhysicalMaterial({ color: '#9aa3ad', roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false });
    const tab = new THREE.MeshPhysicalMaterial({ color: '#f4f4f4', roughness: 0.6, transparent: true });
    const tab2 = new THREE.MeshPhysicalMaterial({ color: '#3b8be0', roughness: 0.5, transparent: true });
    return { steel, steelOut, front, frontSolid, wire, plastic, ceramic, cupM, glass, dirt, heater, resin, sieve, water, pipe, tab, tab2 };
  }, []);

  const lowArm = useRef<THREE.Group>(null);
  const upArm = useRef<THREE.Group>(null);
  const impeller = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const tabRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const dirtRef = useRef<THREE.InstancedMesh>(null);

  // dishes: plates in the lower rack (standing, facing ±x), cups & glasses upside-down in the upper rack
  const dishes = useMemo(() => {
    const plates: THREE.Matrix4[] = [];
    for (let i = 0; i < 9; i++) {
      for (const zc of [-1.0, 0.95]) {
        const x = -1.55 + i * 0.38;
        const m = new THREE.Matrix4().compose(v(x, 1.4 + 0.46, zc), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2 - 0.12)), v(1, 1, 1));
        plates.push(m);
      }
    }
    const cups: THREE.Matrix4[] = [];
    const glasses: THREE.Matrix4[] = [];
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 2; j++) {
        const m = new THREE.Matrix4().compose(v(-1.6 + i * 0.62, 4.0 + 0.4, -1.2 + j * 0.85), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), v(1, 1, 1));
        (j === 0 ? cups : glasses).push(m);
      }
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Matrix4().compose(v(-1.6 + i * 0.62, 4.0 + 0.52, 0.65 + (i % 2) * 0.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), v(1, 1, 1));
      glasses.push(m);
    }
    return { plates, cups, glasses };
  }, []);
  const ND = 90;
  useTimelineFrame((t) => {
    const a = track.armAngleFast(t);
    if (lowArm.current) lowArm.current.rotation.y = a;
    if (upArm.current) upArm.current.rotation.y = -a * 1.15;
    if (impeller.current) impeller.current.rotation.y = t * 40 * track.pump(t);
    mats.heater.emissiveIntensity = 2.2 * track.heater(t);
    const x = track.xray(t);
    mats.frontSolid.opacity = 1 - x;
    mats.frontSolid.visible = x < 0.999;
    mats.front.uniforms.uOpacity.value = 0.5 * x;
    mats.sieve.emissiveIntensity = 0.8 * track.sieve(t);
    const dv0 = track.dishes(t);
    for (const m of [mats.ceramic, mats.cupM, mats.dirt, mats.wire]) {
      m.transparent = true;
      m.opacity = dv0;
      m.visible = dv0 > 0.01;
      m.depthWrite = dv0 > 0.5;
    }
    mats.glass.visible = dv0 > 0.01;
    if (flap.current) flap.current.rotation.x = -1.1 * track.dispenser(t);
    if (tabRef.current) {
      const d = track.dispenser(t);
      const dis = Math.min(1, Math.max(0, (t - track.T.enzymes[0] - 0.8) / 3));
      tabRef.current.visible = dis < 0.99;
      tabRef.current.position.set(0, -0.35 * d, 0.06 * d);
      tabRef.current.scale.setScalar(1 - 0.9 * dis);
    }
    if (waterRef.current) {
      const l = track.sumpLevel(t);
      waterRef.current.visible = l > 0.01;
      waterRef.current.scale.set(1, Math.max(0.01, l), 1);
    }
    // food residues on plates and cups
    const dm = dirtRef.current!;
    const dv = track.dirt(t);
    const c = new THREE.Color();
    for (let i = 0; i < ND; i++) {
      const pl = dishes.plates[i % dishes.plates.length];
      const local = v((hash2(i, 1) - 0.5) * 0.12 + 0.07, 0.11 + 0.02, 0).applyAxisAngle(v(0, 1, 0), hash2(i, 2) * 6.28);
      local.x = Math.cos(hash2(i, 2) * 6.28) * 0.3 * Math.sqrt(hash2(i, 3));
      local.z = Math.sin(hash2(i, 2) * 6.28) * 0.3 * Math.sqrt(hash2(i, 3));
      local.y = 0.06;
      const k = Math.max(0, Math.min(1, dv * 1.4 - hash2(i, 4) * 0.4));
      const s = (0.025 + 0.03 * hash2(i, 5)) * k;
      const m = new THREE.Matrix4().compose(local.applyMatrix4(pl), new THREE.Quaternion().setFromRotationMatrix(pl), v(s, s * 0.35, s));
      dm.setMatrixAt(i, m);
      dm.setColorAt(i, c.set(['#c79a3a', '#e8d060', '#9a3a20', '#d9c9a0'][i % 4]));
    }
    dm.instanceMatrix.needsUpdate = true;
    if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
  });

  const W = TUB.x1 - TUB.x0, H = TUB.y1 - TUB.y0, D = TUB.z1 - TUB.z0;
  return (
    <group name="Dishwasher">
      {/* outer cabinet (sides, top, back) and the x-ray front door */}
      <RoundedBox args={[0.12, 6.8, 4.8]} radius={0.03} position={[-2.44, 3.4, 0]} material={mats.steelOut} castShadow receiveShadow />
      <RoundedBox args={[0.12, 6.8, 4.8]} radius={0.03} position={[2.44, 3.4, 0]} material={mats.steelOut} castShadow receiveShadow />
      <RoundedBox args={[5.0, 0.12, 4.8]} radius={0.03} position={[0, 6.74, 0]} material={mats.steelOut} castShadow />
      <RoundedBox args={[5.0, 6.8, 0.1]} radius={0.03} position={[0, 3.4, -2.42]} material={mats.steelOut} receiveShadow />
      <mesh position={[0, 3.4, 2.42]} material={mats.frontSolid}>
        <boxGeometry args={[4.98, 6.78, 0.1]} />
      </mesh>
      <mesh position={[0, 3.4, 2.42]} material={mats.front} renderOrder={25}>
        <boxGeometry args={[4.98, 6.78, 0.1]} />
      </mesh>
      {/* stainless tub (seen from inside) */}
      <mesh position={[0, TUB.y0 + H / 2, 0]} material={mats.steel} receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh geometry={geo.lowerRack} material={mats.wire} />
      <mesh geometry={geo.upperRack} material={mats.wire} />
      {dishes.plates.map((m, i) => (
        <mesh key={`p${i}`} geometry={geo.plate} material={mats.ceramic} matrixAutoUpdate={false} matrix={m} castShadow />
      ))}
      {dishes.cups.map((m, i) => (
        <mesh key={`c${i}`} geometry={geo.cup} material={mats.cupM} matrixAutoUpdate={false} matrix={m} castShadow />
      ))}
      {dishes.glasses.map((m, i) => (
        <mesh key={`g${i}`} geometry={geo.glass} material={mats.glass} matrixAutoUpdate={false} matrix={m} renderOrder={8} />
      ))}
      <instancedMesh ref={dirtRef} args={[undefined, mats.dirt, ND]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 8]} />
      </instancedMesh>
      {/* spray arms */}
      <group ref={lowArm} position={HUB_LOW}>
        <mesh geometry={geo.armLow.g} material={mats.plastic} castShadow />
        <mesh geometry={geo.armLow.hub} material={mats.plastic} />
      </group>
      <group ref={upArm} position={HUB_UP}>
        <mesh geometry={geo.armUp.g} material={mats.plastic} castShadow />
        <mesh geometry={geo.armUp.hub} material={mats.plastic} />
      </group>
      {/* sump with cylindrical fine filter, collected water */}
      <mesh position={[SUMP[0], 0.55, SUMP[2]]} material={mats.sieve}>
        <cylinderGeometry args={[0.32, 0.26, 0.42, 32, 1, true]} />
      </mesh>
      <mesh ref={waterRef} position={[SUMP[0], 0.36, SUMP[2]]} material={mats.water}>
        <cylinderGeometry args={[0.55, 0.45, 0.5, 32]} />
      </mesh>
      {/* circulation pump with impeller and flow-through heater ring */}
      <mesh position={PUMP} material={mats.steelOut}>
        <cylinderGeometry args={[0.26, 0.26, 0.24, 32]} />
      </mesh>
      <group ref={impeller} position={[PUMP[0], PUMP[1] + 0.14, PUMP[2]]}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} material={mats.plastic} rotation={[0, (k / 6) * Math.PI * 2, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.36, 0.05, 0.03]} />
          </mesh>
        ))}
      </group>
      <mesh position={[PUMP[0], PUMP[1] + 0.02, PUMP[2]]} rotation={[Math.PI / 2, 0, 0]} material={mats.heater}>
        <torusGeometry args={[0.34, 0.045, 12, 48]} />
      </mesh>
      <mesh position={[PUMP[0] + 0.45, PUMP[1], PUMP[2]]} rotation={[0, 0, Math.PI / 2]} material={mats.steelOut}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 24]} />
      </mesh>
      {/* water softener (ion exchanger) with salt container */}
      <mesh position={SOFTENER} material={mats.resin}>
        <boxGeometry args={[0.6, 0.5, 0.7]} />
      </mesh>
      {/* pipes */}
      {Object.values(PIPES).map((c, i) => (
        <mesh key={i} material={mats.pipe}>
          <tubeGeometry args={[c, 64, 0.06, 10, false]} />
        </mesh>
      ))}
      {/* detergent dispenser on the inside of the door: flap opens, tab drops and dissolves */}
      <group position={DISPENSER}>
        <mesh material={mats.plastic} position={[0, 0, -0.06]}>
          <boxGeometry args={[0.55, 0.42, 0.06]} />
        </mesh>
        <group ref={flap} position={[0, -0.21, -0.1]}>
          <mesh material={mats.plastic} position={[0, 0.21, 0]}>
            <boxGeometry args={[0.55, 0.42, 0.03]} />
          </mesh>
        </group>
        <group ref={tabRef}>
          <mesh material={mats.tab} position={[0, 0, -0.14]}>
            <boxGeometry args={[0.3, 0.2, 0.1]} />
          </mesh>
          <mesh material={mats.tab2} position={[0, 0, -0.14]}>
            <sphereGeometry args={[0.07, 16, 12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
