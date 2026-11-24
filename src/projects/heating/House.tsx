import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { BOILER, BURNER, FLOOR, HEAD, PUMP, RAD, VALVE } from './script';
import * as track from './script';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** straight pipe runs with sharp elbows (also used by the flow particles) */
export function poly(pts: THREE.Vector3[]) {
  const c = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) c.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  return c;
}
const BOT = BOILER.y - BOILER.h / 2;
export const PIPES = {
  supply: poly([v(-1.45, BOT, -2.2), v(-1.45, 1.1, -2.2), v(-1.45, 1.1, -2.4), v(VALVE[0], 1.1, -2.4), v(VALVE[0], FLOOR + 1.2, -2.4), v(VALVE[0], FLOOR + 1.2, RAD.z), v(VALVE[0], VALVE[1], RAD.z), v(RAD.x1, VALVE[1], RAD.z)]),
  ret: poly([v(RAD.x0, RAD.y0 + 0.1, RAD.z), v(-1.05, RAD.y0 + 0.1, RAD.z), v(-1.05, RAD.y0 + 0.1, -2.5), v(-1.05, 0.85, -2.5), v(-1.75, 0.85, -2.5), v(-1.75, 0.85, -2.2), v(-1.75, BOT, -2.2)]),
  gas: poly([v(-1.2, BOT, -2.25), v(-1.2, 1.3, -2.25), v(-1.2, 1.3, -2.6)]),
  flue: poly([v(BOILER.x, BOILER.y + BOILER.h / 2, BOILER.z), v(BOILER.x, 3.85, BOILER.z), v(BOILER.x, 3.85, -2.9)]),
  condensate: poly([v(-1.95, BOT, -2.05), v(-1.95, 0.55, -2.05)]),
};
/** heat-exchanger coil around the burner (return enters at the bottom, supply leaves at the top) */
export const COIL = (() => {
  const pts: THREE.Vector3[] = [];
  const turns = 6.5, n = 260, r = 0.25, y0 = BURNER[1] - 0.48, y1 = BURNER[1] + 0.28;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = u * turns * Math.PI * 2;
    pts.push(v(BURNER[0] + r * Math.cos(a), y0 + (y1 - y0) * u, BURNER[2] + r * Math.sin(a)));
  }
  return new THREE.CatmullRomCurve3(pts);
})();

function tube(curve: THREE.Curve<THREE.Vector3>, r: number, seg = 64) {
  return new THREE.TubeGeometry(curve, seg, r, 14, false);
}

export function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d')!;
  const W = 1024 / 8;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 3; j++) {
      const off = (hash2(i, 7) * 1024) | 0;
      const y0 = (j * 400 + off) % 1024;
      const l = 0.5 + 0.12 * hash2(i, j);
      g.fillStyle = `hsl(28, 38%, ${l * 52}%)`;
      g.fillRect(i * W, y0, W, 400);
      g.fillRect(i * W, y0 - 1024, W, 400);
      for (let k = 0; k < 30; k++) {
        g.strokeStyle = `rgba(60,35,15,${0.05 + 0.08 * hash2(k, i + j)})`;
        g.lineWidth = 1 + 2 * hash2(k, 3);
        const x = i * W + hash2(k, i * 3 + j) * W;
        g.beginPath();
        g.moveTo(x, y0);
        g.bezierCurveTo(x + 6, y0 + 130, x - 6, y0 + 260, x + 3, y0 + 400);
        g.stroke();
      }
      g.fillStyle = 'rgba(20,10,5,0.6)';
      g.fillRect(i * W, y0, W, 3);
    }
    g.fillStyle = 'rgba(20,10,5,0.7)';
    g.fillRect(i * W, 0, 3, 1024);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.2, 1.6);
  t.anisotropy = 8;
  return t;
}

/** scale ring of the thermostat head: ❄ 1 2 3 4 5 */
function scaleTexture() {
  // cylinder UV: u = 0 at the front (+z), growing downwards; canvas top = cap end (+x)
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 768;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f4f1';
  g.fillRect(0, 0, 2048, 768);
  for (let x = 0; x < 2048; x += 16) {
    g.fillStyle = 'rgba(0,0,0,0.05)';
    g.fillRect(x, 0, 6, 768);
  }
  g.fillStyle = '#1c2026';
  g.font = '800 230px Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const marks = ['*', '1', '2', '3', '4', '5'];
  marks.forEach((m, i) => {
    // 50° per step, "3" at the front (u = 0)
    const u = (((i - 3) * 50) / 360 + 1) % 1;
    for (const off of [0, 1, -1]) {
      g.save();
      g.translate((u + off) * 2048, 330);
      g.rotate(-Math.PI / 2);
      g.fillText(m, 0, 0);
      g.restore();
      if (i < 5) for (let k = 1; k < 5; k++) g.fillRect((u + off + (k * 10) / 360) * 2048 - 4, 640, 8, 90);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** radiator water: vertical channels, hot at the top, cooler at the bottom, flowing downwards */
function createRadWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 0 }, uHot: { value: new THREE.Color('#ff4a1c') }, uWarm: { value: new THREE.Color('#ff9a3a') }, uCool: { value: new THREE.Color('#3a86e0') }, uCold: { value: new THREE.Color('#1d3e66') } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat, uTime, uOpacity;
      uniform vec3 uHot, uWarm, uCool, uCold;
      varying vec2 vUv;
      void main() {
        float ch = abs(fract(vUv.x * 30.0) - 0.5) * 2.0;
        float channel = smoothstep(0.95, 0.7, ch);
        float header = step(0.9, vUv.y) + step(vUv.y, 0.08);
        float m = max(channel, header);
        // temperature: hot water comes in at the top and spreads downwards as the radiator warms up
        float reach = uHeat * 1.15;
        float hotness = smoothstep(1.0 - reach - 0.25, 1.0 - reach + 0.1, vUv.y) ;
        vec3 warmCol = mix(mix(uCool, uWarm, smoothstep(0.0, 0.7, vUv.y)), uHot, smoothstep(0.65, 1.0, vUv.y));
        vec3 col = mix(uCold, warmCol, clamp(hotness + uHeat * 0.6, 0.0, 1.0));
        float flow = 0.85 + 0.15 * sin((vUv.y + uTime * 0.35) * 60.0);
        col *= flow * (0.6 + 0.4 * m);
        float a = uOpacity * (0.25 + 0.75 * m);
        gl_FragColor = vec4(col * 1.1, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** corrugated radiator panel (vertical ribs) */
function panelGeo(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h, 240, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, 0.018 * Math.abs(Math.sin((Math.PI * (x + w / 2)) / 0.08)));
  }
  g.computeVertexNormals();
  return g;
}

export function House() {
  const W = RAD.x1 - RAD.x0, H = RAD.y1 - RAD.y0, RX = (RAD.x0 + RAD.x1) / 2, RY = (RAD.y0 + RAD.y1) / 2;
  const geo = useMemo(
    () => ({
      supply: tube(PIPES.supply, 0.045, 200),
      ret: tube(PIPES.ret, 0.045, 200),
      gas: tube(PIPES.gas, 0.035, 40),
      flue: tube(PIPES.flue, 0.11, 40),
      condensate: tube(PIPES.condensate, 0.015, 8),
      coil: tube(COIL, 0.034, 600),
      panel: panelGeo(W, H),
    }),
    [W, H],
  );
  const mats = useMemo(() => {
    const plaster = new THREE.MeshStandardMaterial({ color: '#cfc8bd', roughness: 0.92 });
    const concrete = new THREE.MeshStandardMaterial({ color: '#6e7174', roughness: 0.95 });
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 });
    const copper = new THREE.MeshPhysicalMaterial({ color: '#c27a4a', metalness: 1, roughness: 0.3, clearcoat: 0.4, transparent: true });
    const gas = new THREE.MeshStandardMaterial({ color: '#e8c21a', roughness: 0.4, metalness: 0.2 });
    const white = new THREE.MeshPhysicalMaterial({ color: '#eef0f2', roughness: 0.35, clearcoat: 0.6, transparent: true });
    const flue = new THREE.MeshPhysicalMaterial({ color: '#e9ebed', roughness: 0.4, clearcoat: 0.3 });
    const steel = new THREE.MeshPhysicalMaterial({ color: '#b9bec4', metalness: 0.9, roughness: 0.3 });
    const coil = new THREE.MeshPhysicalMaterial({ color: '#b9bec4', metalness: 0.9, roughness: 0.3, transparent: true });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2f36', roughness: 0.5, metalness: 0.3 });
    const burner = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.6, metalness: 0.7, emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0 });
    const red = new THREE.MeshPhysicalMaterial({ color: '#c8242a', roughness: 0.35, clearcoat: 0.8 });
    const pumpBody = new THREE.MeshPhysicalMaterial({ color: '#3b4c5e', roughness: 0.35, metalness: 0.3, clearcoat: 0.6 });
    const radWhite = new THREE.MeshPhysicalMaterial({ color: '#f3f3f0', roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide, transparent: true });
    const radBack = new THREE.MeshPhysicalMaterial({ color: '#e9e9e6', roughness: 0.35, clearcoat: 0.6 });
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#dfe3e8', metalness: 1, roughness: 0.12 });
    const head = new THREE.MeshPhysicalMaterial({ map: scaleTexture(), roughness: 0.35, clearcoat: 0.5 });
    const headCap = new THREE.MeshPhysicalMaterial({ color: '#f1f1ee', roughness: 0.35, clearcoat: 0.5 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#2a4a7a', roughness: 0.05, transparent: true, opacity: 0.35, emissive: new THREE.Color('#0d1d38'), emissiveIntensity: 1 });
    const night = new THREE.MeshBasicMaterial({ color: '#0a1630' });
    const frame = new THREE.MeshStandardMaterial({ color: '#f2f2ef', roughness: 0.4 });
    const snow = new THREE.MeshBasicMaterial({ color: '#dfe9ff' });
    const xBoiler = createXRayMaterial('#bfe2ff');
    const xRad = createXRayMaterial('#ffd2b0');
    const water = createRadWaterMaterial();
    const display = new THREE.MeshBasicMaterial({ color: '#0e1a22' });
    const led = new THREE.MeshBasicMaterial({ color: '#43e08a', toneMapped: false });
    const condensate = new THREE.MeshPhysicalMaterial({ color: '#dfefff', roughness: 0.1, transparent: true, opacity: 0.5 });
    return { coil, plaster, concrete, wood, copper, gas, white, flue, steel, dark, burner, red, pumpBody, radWhite, radBack, chrome, head, headCap, glass, night, frame, snow, xBoiler, xRad, water, display, led, condensate };
  }, []);

  const headRef = useRef<THREE.Group>(null);
  const snowRef = useRef<THREE.InstancedMesh>(null);
  const NS = 70;
  const _m = useMemo(() => new THREE.Matrix4(), []);
  useTimelineFrame((t) => {
    // thermostat head: 50° per step; turning to a higher number rotates the ring "down" at the front
    if (headRef.current) headRef.current.rotation.x = (-(track.setting(t) - 3) * 50 * Math.PI) / 180;
    const x = track.boilerXray(t);
    mats.white.opacity = 1 - x;
    mats.white.visible = x < 0.995;
    mats.white.depthWrite = x < 0.5;
    mats.xBoiler.uniforms.uOpacity.value = x;
    mats.burner.emissiveIntensity = 1.6 * track.flame(t);
    const px = track.pipeXray(t);
    mats.copper.opacity = 1 - 0.6 * px;
    mats.copper.depthWrite = px < 0.5;
    mats.coil.opacity = 1 - 0.6 * px;
    mats.coil.depthWrite = px < 0.5;
    const rx = track.radXray(t);
    mats.radWhite.opacity = 1 - rx;
    mats.radWhite.depthWrite = rx < 0.5;
    mats.xRad.uniforms.uOpacity.value = rx;
    mats.water.uniforms.uOpacity.value = rx;
    mats.water.uniforms.uHeat.value = track.radHeat(t);
    mats.water.uniforms.uTime.value = t;
    const sm = snowRef.current;
    if (sm) {
      for (let i = 0; i < NS; i++) {
        const y = FLOOR + 4.6 - (((t * (0.25 + 0.15 * hash2(i, 2)) + hash2(i, 1)) % 1) * 2.8);
        const xx = -0.8 + hash2(i, 3) * 2.2 + 0.05 * Math.sin(t * 1.3 + i);
        _m.makeScale(0.018, 0.018, 0.018).setPosition(xx, y, -3.0 - hash2(i, 4) * 0.5);
        sm.setMatrixAt(i, _m);
      }
      sm.instanceMatrix.needsUpdate = true;
    }
  });

  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material, key?: string) => (
    <mesh key={key} material={m} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} castShadow receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
    </mesh>
  );
  const WX0 = -0.75, WX1 = 1.35, WY0 = FLOOR + 2.0, WY1 = FLOOR + 4.4, TOP = FLOOR + 5.2;
  return (
    <group name="House">
      {/* room: back wall with window, left wall, wooden floor */}
      {box(-3.5, WX0, FLOOR, TOP, -2.9, -2.6, mats.plaster, 'w1')}
      {box(WX1, 3.2, FLOOR, TOP, -2.9, -2.6, mats.plaster, 'w2')}
      {box(WX0, WX1, FLOOR, WY0, -2.9, -2.6, mats.plaster, 'w3')}
      {box(WX0, WX1, WY1, TOP, -2.9, -2.6, mats.plaster, 'w4')}
      {box(-3.5, -3.2, FLOOR, TOP, -2.6, 2.6, mats.plaster, 'w5')}
      <mesh material={mats.wood} rotation-x={-Math.PI / 2} position={[0, FLOOR + 0.003, 0]} receiveShadow>
        <planeGeometry args={[6.4, 5.2]} />
      </mesh>
      {box(-3.2, 3.2, FLOOR, FLOOR + 0.12, -2.6, -2.57, mats.frame, 'sk')}
      {/* window */}
      {box(WX0, WX1, WY0, WY0 + 0.08, -2.85, -2.62, mats.frame, 'f1')}
      {box(WX0, WX1, WY1 - 0.08, WY1, -2.85, -2.62, mats.frame, 'f2')}
      {box(WX0, WX0 + 0.08, WY0, WY1, -2.85, -2.62, mats.frame, 'f3')}
      {box(WX1 - 0.08, WX1, WY0, WY1, -2.85, -2.62, mats.frame, 'f4')}
      {box((WX0 + WX1) / 2 - 0.04, (WX0 + WX1) / 2 + 0.04, WY0, WY1, -2.8, -2.66, mats.frame, 'f5')}
      {box(WX0 - 0.05, WX1 + 0.05, WY0 - 0.04, WY0, -2.6, -2.45, mats.frame, 'sill')}
      <mesh material={mats.glass} position={[(WX0 + WX1) / 2, (WY0 + WY1) / 2, -2.74]}>
        <planeGeometry args={[WX1 - WX0, WY1 - WY0]} />
      </mesh>
      <mesh material={mats.night} position={[(WX0 + WX1) / 2, (WY0 + WY1) / 2, -3.7]}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <instancedMesh ref={snowRef} args={[undefined, mats.snow, NS]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
      </instancedMesh>

      {/* ceiling slab (section) and basement */}
      {box(-3.5, 3.2, 4.5, FLOOR, -2.9, 2.6, mats.concrete, 'slab')}
      {box(-3.5, 3.2, 0, 4.5, -2.9, -2.6, mats.concrete, 'bw')}
      {box(-3.5, -3.2, 0, 4.5, -2.6, 2.6, mats.concrete, 'bl')}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
        <planeGeometry args={[6.4, 5.2]} />
        <meshStandardMaterial color="#55585b" roughness={0.9} />
      </mesh>

      {/* gas condensing boiler */}
      <group position={[BOILER.x, BOILER.y, BOILER.z]}>
        <RoundedBox args={[BOILER.w, BOILER.h, BOILER.d]} radius={0.05} smoothness={4} material={mats.white} castShadow />
        <RoundedBox args={[BOILER.w, BOILER.h, BOILER.d]} radius={0.05} smoothness={4} material={mats.xBoiler} renderOrder={20} />
        <mesh material={mats.display} position={[0, -BOILER.h / 2 + 0.16, BOILER.d / 2 + 0.003]}>
          <planeGeometry args={[0.42, 0.12]} />
        </mesh>
        <mesh material={mats.led} position={[0.15, -BOILER.h / 2 + 0.16, BOILER.d / 2 + 0.006]}>
          <circleGeometry args={[0.012, 12]} />
        </mesh>
        {/* blower on top of the burner */}
        <mesh material={mats.dark} position={[0.25, BOILER.h / 2 - 0.2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.14, 24]} />
        </mesh>
      </group>
      <mesh geometry={geo.coil} material={mats.coil} />
      <mesh material={mats.burner} position={BURNER}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 32]} />
      </mesh>
      <mesh geometry={geo.flue} material={mats.flue} castShadow />
      <mesh geometry={geo.gas} material={mats.gas} />
      <mesh geometry={geo.condensate} material={mats.condensate} />
      <mesh material={mats.condensate} position={[-1.95, 0.5, -2.05]}>
        <cylinderGeometry args={[0.06, 0.03, 0.1, 20, 1, true]} />
      </mesh>
      {/* expansion vessel */}
      <mesh material={mats.red} position={[-2.65, 2.7, -2.47]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.26, 0.26, 0.16, 40]} />
      </mesh>
      <mesh material={mats.copper} position={[-2.65, 2.18, -2.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 10]} />
      </mesh>
      {/* pipes and pump */}
      <mesh geometry={geo.supply} material={mats.copper} castShadow />
      <mesh geometry={geo.ret} material={mats.copper} castShadow />
      <group position={PUMP}>
        <mesh material={mats.pumpBody}>
          <cylinderGeometry args={[0.085, 0.085, 0.16, 32]} />
        </mesh>
        <mesh material={mats.pumpBody} position={[0, 0, 0.12]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.075, 0.075, 0.18, 32]} />
        </mesh>
        <mesh material={mats.dark} position={[0, 0, 0.215]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.012, 24]} />
        </mesh>
      </group>

      {/* panel radiator: back panel, water channels, front panel (fades to x-ray), convector grille */}
      <mesh material={mats.radBack} position={[RX, RY, RAD.z - 0.07]} castShadow>
        <boxGeometry args={[W, H, 0.04]} />
      </mesh>
      <mesh material={mats.water} position={[RX, RY, RAD.z]} renderOrder={18}>
        <planeGeometry args={[W - 0.04, H - 0.04]} />
      </mesh>
      <mesh geometry={geo.panel} material={mats.radWhite} position={[RX, RY, RAD.z + 0.06]} castShadow />
      <mesh material={mats.xRad} position={[RX, RY, RAD.z]} renderOrder={21}>
        <boxGeometry args={[W, H, 0.16]} />
      </mesh>
      {box(RAD.x0, RAD.x1, RAD.y1, RAD.y1 + 0.02, RAD.z - 0.09, RAD.z + 0.09, mats.radBack, 'grille')}
      {[RAD.x0 + 0.25, RAD.x1 - 0.25].map((x) => (
        <mesh key={x} material={mats.chrome} position={[x, RAD.y0 - 0.2, RAD.z - 0.1]}>
          <boxGeometry args={[0.05, 0.5, 0.04]} />
        </mesh>
      ))}

      {/* thermostatic valve: body + head (axis +x) */}
      <mesh material={mats.chrome} position={VALVE}>
        <cylinderGeometry args={[0.034, 0.034, 0.16, 24]} />
      </mesh>
      <mesh material={mats.chrome} position={[(VALVE[0] + HEAD[0]) / 2 - 0.02, VALVE[1], VALVE[2]]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.045, 0.045, 0.1, 24]} />
      </mesh>
      <group position={HEAD}>
        {/* fixed marker on the collar (front) */}
        <mesh material={mats.headCap} position={[-0.02, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.06, 0.06, 0.03, 40]} />
        </mesh>
        <mesh position={[-0.02, 0, 0.061]}>
          <boxGeometry args={[0.012, 0.03, 0.004]} />
          <meshBasicMaterial color="#e03a2a" />
        </mesh>
        <group ref={headRef}>
          <mesh material={mats.head} position={[0.09, 0, 0]} rotation-z={-Math.PI / 2}>
            <cylinderGeometry args={[0.066, 0.066, 0.15, 72, 1, true]} />
          </mesh>
          <mesh material={mats.headCap} position={[0.165, 0, 0]} rotation-z={-Math.PI / 2} scale={[1, 0.35, 1]}>
            <sphereGeometry args={[0.066, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
