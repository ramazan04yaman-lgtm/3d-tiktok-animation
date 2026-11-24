import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { poly, woodTexture } from '../heating/House';
import { COMP, FAN_IN, FAN_OUT, IN, OUT, PRESS, VALVE } from './script';
import * as track from './script';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** indoor coil tubes (x, y) in the section: front slab + rear slab, an inverted V over the fan */
export const COIL_IN: [number, number][] = [[-0.58, 3.98], [-0.55, 4.1], [-0.52, 4.22], [-0.48, 4.34], [-0.43, 4.46], [-0.34, 4.5], [-0.26, 4.46], [-0.2, 4.4]];
/** condenser tube rows (x positions, top → bottom serpentine) at the back of the outdoor unit */
const CZ = OUT.z0 + 0.08;

/** closed refrigerant loop: valve → liquid line → indoor coil → gas line → compressor → condenser → valve */
export const LOOP = (() => {
  const pts: THREE.Vector3[] = [];
  pts.push(v(VALVE[0], VALVE[1], VALVE[2]), v(OUT.x0 - 0.02, VALVE[1], VALVE[2]), v(0.3, VALVE[1], 0.05), v(0.3, 4.2, 0.05), v(IN.x1 + 0.02, 4.2, 0.05), v(-0.2, 4.2, IN.z1 - 0.05));
  // indoor serpentine: tubes along z
  COIL_IN.slice().reverse().forEach(([x, y], i) => {
    const z = i % 2 === 0 ? IN.z0 + 0.06 : IN.z1 - 0.06;
    pts.push(v(x, y, i % 2 === 0 ? IN.z1 - 0.06 : IN.z0 + 0.06), v(x, y, z));
  });
  const last = pts[pts.length - 1];
  pts.push(v(-0.25, 4.0, last.z), v(-0.25, 4.0, -0.05), v(IN.x1 + 0.02, 4.0, -0.05), v(0.42, 4.0, -0.05), v(0.42, 0.8, -0.05), v(OUT.x0 - 0.02, 0.8, -0.05), v(COMP[0] - 0.1, 0.8, COMP[2]), v(COMP[0], 0.35, COMP[2]), v(COMP[0], 0.95, COMP[2]));
  // discharge to the condenser top, then a serpentine down the back
  const rows = [1.28, 1.13, 0.98, 0.83, 0.68, 0.53, 0.38, 0.24];
  pts.push(v(1.12, 1.28, CZ));
  rows.forEach((y, i) => {
    const a = i % 2 === 0 ? 1.12 : OUT.x1 - 0.08;
    const b = i % 2 === 0 ? OUT.x1 - 0.08 : 1.12;
    pts.push(v(a, y, CZ), v(b, y, CZ));
  });
  pts.push(v(1.12, 0.24, CZ), v(1.02, 0.3, VALVE[2]), v(VALVE[0], 0.3, VALVE[2]), v(VALVE[0], VALVE[1], VALVE[2]));
  const c = poly(pts);
  // markers along the loop (u) for colouring
  const L = c.getCurveLengths();
  const total = L[L.length - 1];
  const at = (seg: number) => L[seg - 1] / total;
  const nIn = 6 + COIL_IN.length * 2;
  return { curve: c, uInStart: at(6), uInEnd: at(nIn - 1), uComp: at(nIn + 8), uCondStart: at(nIn + 9), uCondEnd: at(nIn + 9 + rows.length * 2) };
})();

function tube(curve: THREE.Curve<THREE.Vector3>, r: number, seg = 64) {
  return new THREE.TubeGeometry(curve, seg, r, 12, false);
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#3f86c8');
  gr.addColorStop(0.6, '#9cc8e8');
  gr.addColorStop(1, '#f4d9a8');
  g.fillStyle = gr;
  g.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** wavy sheet of paper (amplitude driven per frame) */
function sheetGeo() {
  return new THREE.PlaneGeometry(0.9, 0.62, 24, 16);
}

export function Units() {
  const geo = useMemo(() => {
    // pipe runs between the units (two insulated lines + condensate hose)
    const liquid = poly([v(OUT.x0, 1.12, -0.05), v(0.3, 1.12, 0.05), v(0.3, 4.2, 0.05), v(-0.15, 4.2, 0.05)]);
    const gas = poly([v(-0.15, 4.0, -0.05), v(0.42, 4.0, -0.05), v(0.42, 0.8, -0.05), v(OUT.x0, 0.8, -0.05)]);
    const hose = poly([v(-0.2, 3.9, 0.3), v(0.22, 3.9, 0.3), v(0.22, 0.45, 0.3), v(0.32, 0.3, 0.3)]);
    // indoor coil tubes (along z) and outdoor condenser tubes (along x)
    const inTubes = COIL_IN.map(([x, y]) => tube(new THREE.LineCurve3(v(x, y, IN.z0 + 0.05), v(x, y, IN.z1 - 0.05)), 0.016, 1));
    return { liquid: tube(liquid, 0.05, 80), gas: tube(gas, 0.065, 80), hose: tube(hose, 0.03, 60), loop: tube(LOOP.curve, 0.018, 900), inTubes, sheet: sheetGeo() };
  }, []);
  const mats = useMemo(() => {
    const plaster = new THREE.MeshStandardMaterial({ color: '#d8d0c4', roughness: 0.92 });
    const facade = new THREE.MeshStandardMaterial({ color: '#c9b9a0', roughness: 0.95 });
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 });
    const paving = new THREE.MeshStandardMaterial({ color: '#8c8a84', roughness: 0.9 });
    const sky = new THREE.MeshBasicMaterial({ map: skyTexture() });
    const casing = new THREE.MeshPhysicalMaterial({ color: '#f4f5f6', roughness: 0.3, clearcoat: 0.7, transparent: true });
    const outCasing = new THREE.MeshPhysicalMaterial({ color: '#e7e9eb', roughness: 0.4, clearcoat: 0.4, metalness: 0.1, transparent: true });
    const xIn = createXRayMaterial('#bfe6ff');
    const xOut = createXRayMaterial('#ffd2b0');
    const insul = new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.8, transparent: true });
    const hose = new THREE.MeshPhysicalMaterial({ color: '#d0e4f0', roughness: 0.2, transparent: true, opacity: 0.6 });
    const copper = new THREE.MeshPhysicalMaterial({ color: '#c27a4a', metalness: 1, roughness: 0.3 });
    const fins = new THREE.MeshPhysicalMaterial({ color: '#c3cad2', metalness: 0.8, roughness: 0.35, transparent: true, opacity: 0.85 });
    const condFins = new THREE.MeshPhysicalMaterial({ color: '#b8bec5', metalness: 0.8, roughness: 0.35, transparent: true, opacity: 0.8 });
    const fan = new THREE.MeshPhysicalMaterial({ color: '#f0f2f4', roughness: 0.4, clearcoat: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#23272d', roughness: 0.55, metalness: 0.4 });
    const comp = new THREE.MeshPhysicalMaterial({ color: '#1d2025', roughness: 0.35, metalness: 0.5, clearcoat: 0.6, emissive: new THREE.Color('#ff4a1c'), emissiveIntensity: 0 });
    const compX = createXRayMaterial('#ff9a6a');
    const brass = new THREE.MeshPhysicalMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.25 });
    const grille = new THREE.MeshStandardMaterial({ color: '#4a4f56', roughness: 0.5, metalness: 0.6, transparent: true });
    const tray = new THREE.MeshStandardMaterial({ color: '#cfd5da', roughness: 0.5 });
    const water = new THREE.MeshPhysicalMaterial({ color: '#7fc4ff', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.7 });
    const iron = new THREE.MeshPhysicalMaterial({ color: '#2b2f2a', roughness: 0.55, metalness: 0.6, transparent: true });
    const roller = new THREE.MeshPhysicalMaterial({ color: '#3a3a3a', roughness: 0.3, metalness: 0.7, transparent: true });
    const paper = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.85, side: THREE.DoubleSide, transparent: true });
    const green = new THREE.MeshPhysicalMaterial({ color: '#3d5a48', roughness: 0.45, metalness: 0.4, transparent: true });
    return { plaster, facade, wood, paving, sky, casing, outCasing, xIn, xOut, insul, hose, copper, fins, condFins, fan, dark, comp, compX, brass, grille, tray, water, iron, roller, paper, green };
  }, []);

  const fanIn = useRef<THREE.Group>(null);
  const fanOut = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Mesh>(null);
  const trayWater = useRef<THREE.Mesh>(null);
  const pressG = useRef<THREE.Group>(null);
  const sheets = useRef<THREE.Mesh[]>([]);
  const base = useMemo(() => Float32Array.from(geo.sheet.attributes.position.array as Float32Array), [geo.sheet]);
  useTimelineFrame((t) => {
    if (fanIn.current) fanIn.current.rotation.z = -t * 9;
    if (fanOut.current) fanOut.current.rotation.z = -t * 7;
    if (rotor.current) {
      rotor.current.rotation.y = t * 14;
    }
    const pi = track.inXray(t), po = track.outXray(t), pp = track.pipeXray(t);
    mats.casing.opacity = 1 - pi;
    mats.casing.depthWrite = pi < 0.5;
    mats.casing.visible = pi < 0.995;
    mats.xIn.uniforms.uOpacity.value = pi;
    mats.outCasing.opacity = 1 - 0.92 * po;
    mats.outCasing.depthWrite = po < 0.5;
    mats.xOut.uniforms.uOpacity.value = po;
    mats.insul.opacity = 1 - 0.8 * pp;
    mats.insul.depthWrite = pp < 0.5;
    mats.comp.emissiveIntensity = 0.3 * track.ramp01(t);
    mats.grille.opacity = 1 - 0.75 * po;
    if (trayWater.current) trayWater.current.scale.y = Math.max(0.001, track.drain(t));
    const pv = track.press(t);
    if (pressG.current) {
      pressG.current.visible = pv > 0.002;
      pressG.current.scale.setScalar(0.85 + 0.15 * pv);
    }
    for (const m of [mats.iron, mats.roller, mats.paper, mats.green]) m.opacity = pv;
    // humid paper curls; dried paper lies flat
    const amp = 0.05 * Math.min(1, Math.max(0, (track.humidity(t) - 45) / 40));
    const p = geo.sheet.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      p.setZ(i, amp * (Math.sin(x * 9 + 1.3) * 0.6 + Math.sin(y * 11) * 0.4 + 2.2 * Math.pow(Math.abs(x) / 0.45, 3)));
    }
    p.needsUpdate = true;
    geo.sheet.computeVertexNormals();
  });

  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material, key?: string) => (
    <mesh key={key} material={m} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} castShadow receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
    </mesh>
  );
  const IW = IN.x1 - IN.x0, IH = IN.y1 - IN.y0, ID = IN.z1 - IN.z0;
  const OW = OUT.x1 - OUT.x0, OH = OUT.y1 - OUT.y0, OD = OUT.z1 - OUT.z0;
  return (
    <group name="Units">
      {/* exterior wall (section), room, outside */}
      {box(-0.15, 0.15, 0, 5.4, -1.3, 1.0, mats.facade, 'wall')}
      {box(-4.2, -0.15, 0, 5.4, -1.3, -1.0, mats.plaster, 'back')}
      <mesh material={mats.wood} rotation-x={-Math.PI / 2} position={[-2.17, 0.003, 0.6]} receiveShadow>
        <planeGeometry args={[4.05, 3.2]} />
      </mesh>
      <mesh material={mats.paving} rotation-x={-Math.PI / 2} position={[2.2, 0.003, 0.4]} receiveShadow>
        <planeGeometry args={[4.1, 3.6]} />
      </mesh>
      <mesh material={mats.sky} position={[2.2, 2.8, -1.6]}>
        <planeGeometry args={[4.2, 6]} />
      </mesh>

      {/* indoor unit: casing (fades to x-ray), coil fins, cross-flow fan, drain tray, louvre */}
      <RoundedBox args={[IW, IH, ID]} radius={0.06} smoothness={4} material={mats.casing} position={[(IN.x0 + IN.x1) / 2, (IN.y0 + IN.y1) / 2, 0]} castShadow />
      <RoundedBox args={[IW, IH, ID]} radius={0.06} smoothness={4} material={mats.xIn} position={[(IN.x0 + IN.x1) / 2, (IN.y0 + IN.y1) / 2, 0]} renderOrder={20} />
      {/* fin packs: two slanted slabs */}
      <mesh material={mats.fins} position={[-0.52, 4.22, 0]} rotation-z={-0.32}>
        <boxGeometry args={[0.05, 0.52, ID - 0.1]} />
      </mesh>
      <mesh material={mats.fins} position={[-0.27, 4.46, 0]} rotation-z={1.0}>
        <boxGeometry args={[0.05, 0.22, ID - 0.1]} />
      </mesh>
      {geo.inTubes.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.copper} />
      ))}
      <group ref={fanIn} position={FAN_IN}>
        {Array.from({ length: 20 }, (_, i) => (
          <mesh key={i} material={mats.fan} position={[Math.cos((i / 20) * Math.PI * 2) * 0.085, Math.sin((i / 20) * Math.PI * 2) * 0.085, 0]} rotation-z={(i / 20) * Math.PI * 2 + 0.5}>
            <boxGeometry args={[0.008, 0.04, ID - 0.16]} />
          </mesh>
        ))}
      </group>
      {box(-0.6, -0.3, 3.88, 3.9, IN.z0 + 0.06, IN.z1 - 0.06, mats.tray, 'tray')}
      <mesh ref={trayWater} material={mats.water} position={[-0.45, 3.9, 0]}>
        <boxGeometry args={[0.28, 0.025, ID - 0.14]} />
      </mesh>
      <mesh material={mats.casing} position={[-0.6, 3.87, 0]} rotation-z={0.5}>
        <boxGeometry args={[0.1, 0.012, ID - 0.1]} />
      </mesh>

      {/* pipes: insulation (fades) over the copper loop */}
      <mesh geometry={geo.liquid} material={mats.insul} castShadow />
      <mesh geometry={geo.gas} material={mats.insul} castShadow />
      <mesh geometry={geo.hose} material={mats.hose} />
      <mesh geometry={geo.loop} material={mats.copper} />

      {/* outdoor unit */}
      <RoundedBox args={[OW, OH, OD]} radius={0.04} smoothness={3} material={mats.outCasing} position={[(OUT.x0 + OUT.x1) / 2, (OUT.y0 + OUT.y1) / 2, (OUT.z0 + OUT.z1) / 2]} castShadow />
      <RoundedBox args={[OW, OH, OD]} radius={0.04} smoothness={3} material={mats.xOut} position={[(OUT.x0 + OUT.x1) / 2, (OUT.y0 + OUT.y1) / 2, (OUT.z0 + OUT.z1) / 2]} renderOrder={20} />
      {box(OUT.x0 + 0.1, OUT.x1 - 0.1, 0.0, OUT.y0, OUT.z0 + 0.05, OUT.z1 - 0.05, mats.dark, 'feet')}
      {/* condenser fin block at the back */}
      <mesh material={mats.condFins} position={[(1.06 + OUT.x1 - 0.04) / 2, (OUT.y0 + OUT.y1) / 2, CZ]}>
        <boxGeometry args={[OUT.x1 - 0.04 - 1.06, OH - 0.08, 0.08]} />
      </mesh>
      {/* partition between compressor room and fan room */}
      {box(1.02, 1.04, OUT.y0 + 0.02, OUT.y1 - 0.02, OUT.z0 + 0.02, OUT.z1 - 0.02, mats.dark, 'part')}
      {/* fan + grille */}
      <group ref={fanOut} position={[FAN_OUT[0], FAN_OUT[1], OUT.z1 - 0.14]}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} material={mats.dark} rotation-z={(k / 3) * Math.PI * 2} position={[0, 0, 0]}>
            <boxGeometry args={[0.18, 0.5, 0.02]} />
          </mesh>
        ))}
        <mesh material={mats.dark}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 24]} />
        </mesh>
      </group>
      {[0.2, 0.32, 0.44, 0.52].map((r) => (
        <mesh key={r} material={mats.grille} position={[FAN_OUT[0], FAN_OUT[1], OUT.z1 + 0.01]}>
          <torusGeometry args={[r, 0.008, 6, 64]} />
        </mesh>
      ))}
      {/* compressor (x-ray shell + rotating eccentric rotor) */}
      <mesh material={mats.comp} position={COMP} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.5, 32]} />
      </mesh>
      {[1, -1].map((k) => (
        <mesh key={k} material={mats.comp} position={[COMP[0], COMP[1] + k * 0.25, COMP[2]]} scale={[1, 0.45 * k, 1]}>
          <sphereGeometry args={[0.13, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
      <mesh material={mats.compX} position={COMP} renderOrder={22}>
        <cylinderGeometry args={[0.135, 0.135, 0.51, 32]} />
      </mesh>
      <mesh ref={rotor} material={mats.brass} position={[COMP[0], COMP[1] - 0.12, COMP[2]]}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 24]} />
      </mesh>
      {/* expansion valve */}
      <mesh material={mats.brass} position={VALVE}>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 20]} />
      </mesh>

      {/* 1902 printing press + early air-conditioning apparatus (reveal) */}
      <group ref={pressG} position={PRESS}>
        {/* frame */}
        {[-0.65, 0.65].map((x) => (
          <mesh key={x} material={mats.iron} position={[x, 0.55, 0]} castShadow>
            <boxGeometry args={[0.08, 1.1, 0.7]} />
          </mesh>
        ))}
        <mesh material={mats.iron} position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[1.3, 0.06, 0.66]} />
        </mesh>
        <mesh material={mats.roller} position={[0, 0.9, -0.05]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.22, 40]} />
        </mesh>
        <mesh material={mats.iron} position={[0.75, 0.9, -0.05]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.28, 0.025, 10, 40]} />
        </mesh>
        {/* paper stack and curling top sheets */}
        <mesh material={mats.paper} position={[0, 0.72, 0.1]}>
          <boxGeometry args={[0.9, 0.14, 0.62]} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh key={k} ref={(m) => { if (m) sheets.current[k] = m; }} geometry={geo.sheet} material={mats.paper} position={[0.02 * k, 0.8 + 0.02 * k, 0.1]} rotation-x={-Math.PI / 2} />
        ))}
        {/* early air washer/cooler: cabinet with cooling coils and a fan */}
        <group position={[-1.3, 0, -0.75]}>
          <mesh material={mats.green} position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.55, 1.4, 0.4]} />
          </mesh>
          {[0.35, 0.55, 0.75, 0.95].map((y) => (
            <mesh key={y} material={mats.copper} position={[0, y, 0.21]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 12]} />
            </mesh>
          ))}
          <mesh material={mats.iron} position={[0, 1.2, 0.21]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.15, 0.15, 0.04, 30]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

void hash2;
