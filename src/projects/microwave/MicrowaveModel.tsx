import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SectionCut, createXRayMaterial } from '../../engine/components/cutaway';
import { glowColor, thermalColor } from '../../engine/effects/heat';
import { lerp } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { HEAT_N, SOUP_R, getHeatModel } from './heat';
import { CAVITY } from './physics';
import * as track from './script';
import { createDisplay, getDoorMeshTexture, getSoupTexture } from './textures';

/** Section through magnetron + waveguide along their mid-plane z = 0 */
export const magnetronSection = new SectionCut(new THREE.Vector3(0, 0, -1));

export const M = {
  body: { min: [-2.25, 0.06, -1.75], max: [2.25, 2.62, 1.75] },
  magnetron: new THREE.Vector3(1.45, 1.35, 0),
  antennaTip: new THREE.Vector3(0.99, 1.35, 0),
  window: new THREE.Vector3(0.85, 1.95, 0),
  tableCenter: new THREE.Vector3((CAVITY.min[0] + CAVITY.max[0]) / 2, 0.26, 0),
  soupY: 0.6,
  transformer: new THREE.Vector3(1.55, 0.42, -0.8),
  capacitor: new THREE.Vector3(1.5, 0.34, 0.6),
  fan: new THREE.Vector3(1.55, 1.35, -1.38),
  display: new THREE.Vector3(1.6, 2.18, 1.762),
};

const box = (min: number[], max: number[], r = 0.02) =>
  new RoundedBoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2], 2, r).translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

function useMaterials() {
  return useMemo(() => {
    const cut = [magnetronSection.keep];
    const steelRecipe = { color: '#c7cbd1', metalness: 1, roughness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.2 };
    const housingSteel = new THREE.MeshPhysicalMaterial({ name: 'BrushedSteel', ...steelRecipe, transparent: true });
    const housingPlastic = new THREE.MeshPhysicalMaterial({ name: 'GlossBlackPlastic', color: '#0f1013', roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true });
    const doorWindow = new THREE.MeshPhysicalMaterial({ name: 'DoorGlassWithMesh', color: '#0b0d10', roughness: 0.15, metalness: 0.6, clearcoat: 1, transparent: true, opacity: 0.88, alphaMap: getDoorMeshTexture(), envMapIntensity: 1.4, depthWrite: false });
    const enamel = new THREE.MeshPhysicalMaterial({ name: 'CavityEnamel', color: '#d8d5ce', roughness: 0.35, clearcoat: 0.4, transparent: true, side: THREE.DoubleSide });
    const mica = new THREE.MeshStandardMaterial({ name: 'MicaCover', color: '#c9b38a', roughness: 0.6, transparent: true, opacity: 0.9 });
    const steel = new THREE.MeshPhysicalMaterial({ name: 'Steel', ...steelRecipe });
    const steelCut = new THREE.MeshPhysicalMaterial({ name: 'Steel', ...steelRecipe, clippingPlanes: cut, side: THREE.DoubleSide });
    const darkSteel = new THREE.MeshStandardMaterial({ name: 'DarkSteel', color: '#8d939b', metalness: 1, roughness: 0.38 });
    const darkSteelCut = new THREE.MeshStandardMaterial({ name: 'DarkSteel', color: '#8d939b', metalness: 1, roughness: 0.38, clippingPlanes: cut, side: THREE.DoubleSide });
    const aluminiumCut = new THREE.MeshPhysicalMaterial({ name: 'AluminiumFins', color: '#d4d8de', metalness: 0.55, roughness: 0.38, clippingPlanes: cut, side: THREE.DoubleSide });
    const zincCut = new THREE.MeshPhysicalMaterial({ name: 'ZincPlatedYoke', color: '#b9bec6', metalness: 0.6, roughness: 0.32, clearcoat: 0.3, clippingPlanes: cut, side: THREE.DoubleSide });
    const copperCut = new THREE.MeshStandardMaterial({ name: 'CopperAnode', color: '#c27a4a', metalness: 1, roughness: 0.28, clippingPlanes: cut, side: THREE.DoubleSide });
    const copper = new THREE.MeshStandardMaterial({ name: 'CopperWinding', color: '#b8693a', metalness: 1, roughness: 0.35 });
    const ferriteCut = new THREE.MeshStandardMaterial({ name: 'FerriteMagnet', color: '#2a2b2f', roughness: 0.7, clippingPlanes: cut, side: THREE.DoubleSide });
    const ceramicWhite = new THREE.MeshPhysicalMaterial({ name: 'Ceramic', color: '#f4f2ee', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 });
    const cathode = new THREE.MeshStandardMaterial({ name: 'Cathode', color: '#555', emissive: '#000', metalness: 0.5, roughness: 0.4 });
    const lamination = new THREE.MeshStandardMaterial({ name: 'TransformerCore', color: '#3a3d43', metalness: 0.8, roughness: 0.5 });
    const plasticMatte = new THREE.MeshStandardMaterial({ name: 'MatteBlackPlastic', color: '#17181c', roughness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ name: 'TurntableGlass', color: '#eaf4ff', roughness: 0.03, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false, side: THREE.DoubleSide });
    const soup = new THREE.MeshPhysicalMaterial({ name: 'Soup', map: getSoupTexture(), roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.1 });
    const heatTex = new THREE.DataTexture(new Uint8Array(HEAT_N * HEAT_N * 4), HEAT_N, HEAT_N, THREE.RGBAFormat);
    heatTex.colorSpace = THREE.SRGBColorSpace;
    heatTex.magFilter = THREE.LinearFilter;
    heatTex.minFilter = THREE.LinearFilter;
    const thermal = new THREE.MeshBasicMaterial({ name: 'ThermalOverlay', map: heatTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const lamp = new THREE.MeshStandardMaterial({ name: 'Lamp', color: '#fff3d6', emissive: '#ffd9a0', emissiveIntensity: 0 });
    const panelGlass = new THREE.MeshPhysicalMaterial({ name: 'PanelGlass', color: '#07080a', roughness: 0.08, clearcoat: 1, transparent: true, envMapIntensity: 1.5 });
    const display = createDisplay();
    const displayMat = new THREE.MeshBasicMaterial({ name: 'Display', map: display.texture, toneMapped: false, transparent: true });
    const ghost = createXRayMaterial('#8fd0ff', []);
    const ghostCut = createXRayMaterial('#8fd0ff', [magnetronSection.ghost]);
    return { zincCut, housingSteel, housingPlastic, doorWindow, enamel, mica, steel, steelCut, darkSteel, darkSteelCut, aluminiumCut, copperCut, copper, ferriteCut, ceramicWhite, cathode, lamination, plasticMatte, glass, soup, thermal, heatTex, lamp, panelGlass, display, displayMat, ghost, ghostCut };
  }, []);
}

function Faded({ geometry, material, ghost, name, order = 11, shadow = true }: { geometry: THREE.BufferGeometry; material: THREE.Material; ghost: THREE.Material; name: string; order?: number; shadow?: boolean }) {
  return (
    <group name={name}>
      <mesh geometry={geometry} material={material} castShadow={shadow} receiveShadow renderOrder={order} />
      <mesh geometry={geometry} material={ghost} renderOrder={12} />
    </group>
  );
}
function Cut({ geometry, material, ghost, name }: { geometry: THREE.BufferGeometry; material: THREE.Material; ghost: THREE.Material; name: string }) {
  return (
    <group name={name}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh geometry={geometry} material={ghost} renderOrder={12} />
    </group>
  );
}

export function MicrowaveModel() {
  const m = useMaterials();
  const geo = useMemo(() => {
    const [x0, y0, z0] = M.body.min;
    const [x1, y1, z1] = M.body.max;
    const t = 0.05;
    const c = CAVITY;
    const mx = M.magnetron.x;
    const fins = Array.from({ length: 6 }, (_, i) => new THREE.BoxGeometry(0.012, 0.52, 0.52).translate(mx - 0.13 + i * 0.052, M.magnetron.y, 0));
    const vanes = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.28, 0.1, 0.018);
      g.translate(0, 0.12, 0);
      g.rotateX(a);
      return g.translate(mx, M.magnetron.y, 0);
    });
    return {
      // outer housing: wrap + back, front frame around the door opening, control panel
      top: box([x0, y1 - t, z0], [x1, y1, z1 - 0.01], 0.04),
      bottom: box([x0, y0, z0], [x1, y0 + t, z1 - 0.01], 0.03),
      left: box([x0, y0, z0], [x0 + t, y1, z1 - 0.01], 0.03),
      right: box([x1 - t, y0, z0], [x1, y1, z1 - 0.01], 0.03),
      back: box([x0, y0, z0], [x1, y1, z0 + t], 0.03),
      panel: box([0.98, y0 + 0.02, z1 - 0.06], [x1 - 0.01, y1 - 0.02, z1], 0.03),
      // cavity (5 enamel plates)
      cavBack: box([c.min[0], c.min[1], c.min[2] - 0.02], [c.max[0], c.max[1], c.min[2]], 0.005),
      cavLeft: box([c.min[0] - 0.02, c.min[1], c.min[2]], [c.min[0], c.max[1], c.max[2]], 0.005),
      cavRight: box([c.max[0], c.min[1], c.min[2]], [c.max[0] + 0.02, c.max[1], c.max[2]], 0.005),
      cavTop: box([c.min[0], c.max[1], c.min[2]], [c.max[0], c.max[1] + 0.02, c.max[2]], 0.005),
      cavFloor: box([c.min[0], c.min[1] - 0.02, c.min[2]], [c.max[0], c.min[1], c.max[2]], 0.005),
      frame: [
        box([x0 + 0.02, y0 + 0.02, c.max[2]], [c.min[0], y1 - 0.02, z1 - 0.03], 0.01),
        box([c.max[0], y0 + 0.02, c.max[2]], [0.98, y1 - 0.02, z1 - 0.03], 0.01),
        box([c.min[0], c.max[1], c.max[2]], [c.max[0], y1 - 0.02, z1 - 0.03], 0.01),
        box([c.min[0], y0 + 0.02, c.max[2]], [c.max[0], c.min[1], z1 - 0.03], 0.01),
      ],
      mica: new THREE.PlaneGeometry(0.75, 0.42).rotateY(-Math.PI / 2).translate(c.max[0] - 0.004, M.window.y, 0),
      // door (local to hinge at x0, z1)
      doorFrame: new RoundedBoxGeometry(3.18, 2.5, 0.12, 4, 0.05).translate(1.59, 1.34, 0.06),
      doorWindow: new THREE.PlaneGeometry(2.55, 1.8).translate(1.52, 1.36, 0.125),
      handle: new RoundedBoxGeometry(0.12, 1.6, 0.14, 3, 0.05).translate(2.95, 1.34, 0.16),
      // waveguide (steel plates, sectioned)
      wgOuter: new THREE.BoxGeometry(0.02, 1.15, 0.8).translate(1.13, 1.575, 0),
      wgTop: new THREE.BoxGeometry(0.28, 0.02, 0.8).translate(0.99, 2.15, 0),
      wgBottom: new THREE.BoxGeometry(0.28, 0.02, 0.8).translate(0.99, 1.0, 0),
      wgFront: new THREE.BoxGeometry(0.28, 1.15, 0.02).translate(0.99, 1.575, 0.4),
      wgBack: new THREE.BoxGeometry(0.28, 1.15, 0.02).translate(0.99, 1.575, -0.4),
      // magnetron (axis along X, antenna towards −X into the waveguide)
      anode: new THREE.LatheGeometry([v2(0.075, -0.15), v2(0.17, -0.15), v2(0.17, 0.15), v2(0.075, 0.15), v2(0.075, -0.15)], 48).rotateZ(Math.PI / 2).translate(mx, M.magnetron.y, 0),
      vanes,
      cathode: new THREE.CylinderGeometry(0.022, 0.022, 0.34, 16).rotateZ(Math.PI / 2).translate(mx, M.magnetron.y, 0),
      fins,
      magnetA: new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40).rotateZ(Math.PI / 2).translate(mx - 0.21, M.magnetron.y, 0),
      magnetB: new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40).rotateZ(Math.PI / 2).translate(mx + 0.21, M.magnetron.y, 0),
      yokeA: new THREE.BoxGeometry(0.02, 0.56, 0.56).translate(mx - 0.26, M.magnetron.y, 0),
      yokeB: new THREE.BoxGeometry(0.02, 0.56, 0.56).translate(mx + 0.26, M.magnetron.y, 0),
      antenna: new THREE.CylinderGeometry(0.035, 0.05, 0.28, 24).rotateZ(Math.PI / 2).translate(1.13, M.magnetron.y, 0),
      antennaCap: new THREE.SphereGeometry(0.055, 24, 16).translate(M.antennaTip.x, M.antennaTip.y, 0),
      filterBox: new RoundedBoxGeometry(0.26, 0.4, 0.4, 2, 0.03).translate(mx + 0.43, M.magnetron.y, 0),
      // high-voltage section
      core: new RoundedBoxGeometry(0.55, 0.42, 0.5, 2, 0.02).translate(M.transformer.x, M.transformer.y, M.transformer.z),
      coil: new THREE.CylinderGeometry(0.17, 0.17, 0.26, 32).rotateX(Math.PI / 2).translate(M.transformer.x, M.transformer.y, M.transformer.z),
      capacitor: new RoundedBoxGeometry(0.5, 0.3, 0.26, 4, 0.11).translate(M.capacitor.x, M.capacitor.y, M.capacitor.z),
      diode: new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12).rotateZ(Math.PI / 2).translate(M.capacitor.x + 0.42, M.capacitor.y + 0.08, M.capacitor.z),
      fanHub: new THREE.CylinderGeometry(0.07, 0.07, 0.08, 20).rotateX(Math.PI / 2),
      fanBlade: new THREE.BoxGeometry(0.1, 0.26, 0.01).translate(0, 0.17, 0),
      // turntable & bowl
      plate: new THREE.LatheGeometry([v2(0, 0.27), v2(1.05, 0.27), v2(1.18, 0.3), v2(1.2, 0.315), v2(1.17, 0.315), v2(1.05, 0.29), v2(0, 0.29)], 96),
      roller: new THREE.TorusGeometry(0.7, 0.025, 8, 64).rotateX(Math.PI / 2).translate(0, 0.235, 0),
      bowl: new THREE.LatheGeometry([v2(0, 0.295), v2(0.3, 0.295), v2(0.33, 0.31), v2(0.42, 0.42), v2(0.56, 0.6), v2(0.64, 0.7), v2(0.65, 0.715), v2(0.61, 0.712), v2(0.6, 0.69), v2(0.53, 0.6), v2(0.4, 0.44), v2(0.3, 0.34), v2(0, 0.33)], 96),
      soupDisc: new THREE.CircleGeometry(SOUP_R, 72).rotateX(-Math.PI / 2).translate(0, M.soupY, 0),
      thermalDisc: new THREE.CircleGeometry(SOUP_R, 72).rotateX(-Math.PI / 2).translate(0, M.soupY + 0.003, 0),
      feet: [-1.9, 1.9].flatMap((x) => [-1.4, 1.4].map((z) => new THREE.CylinderGeometry(0.12, 0.14, 0.06, 20).translate(x, 0.03, z))),
    };
  }, []);

  const door = useRef<THREE.Group>(null);
  const table = useRef<THREE.Group>(null);
  const fan = useRef<THREE.Group>(null);
  const cavLight = useRef<THREE.PointLight>(null);
  const heatBuf = useMemo(() => new Float32Array(HEAT_N * HEAT_N), []);
  const col = useMemo(() => new THREE.Color(), []);

  useTimelineFrame((t) => {
    const x = track.xray(t);
    for (const mat of [m.housingSteel, m.housingPlastic]) {
      mat.opacity = 1 - x;
      mat.depthWrite = x < 0.001;
      mat.visible = x < 0.999;
    }
    m.doorWindow.opacity = 0.88 * (1 - x);
    m.doorWindow.visible = x < 0.999;
    m.panelGlass.opacity = 1 - x;
    m.panelGlass.depthWrite = x < 0.001;
    m.panelGlass.visible = x < 0.999;
    m.displayMat.opacity = 1 - x;
    m.displayMat.visible = x < 0.999;
    const cx = track.cavityXray(t);
    m.enamel.opacity = 1 - cx;
    m.enamel.depthWrite = cx < 0.001;
    m.mica.opacity = 0.9 - cx * 0.5;
    m.ghost.uniforms.uOpacity.value = x * 0.6;

    const mc = track.magnetronCut(t);
    magnetronSection.set(mc < 0.0005 ? 100 : lerp(0.75, 0.0, mc));
    m.ghostCut.uniforms.uOpacity.value = mc * 0.5;

    const on = track.on(t);
    glowColor(0.85 * on, m.cathode.emissive);
    m.cathode.emissiveIntensity = on * 3;
    m.lamp.emissiveIntensity = track.cavityLight(t) * 3;
    if (cavLight.current) cavLight.current.intensity = track.cavityLight(t) * 4.5;
    if (fan.current) fan.current.rotation.z = -Math.max(0, Math.min(t, track.T.powerOff + 1) - track.T.powerOn) * 14;
    if (table.current) table.current.rotation.y = track.turntableAngle(t);
    if (door.current) door.current.rotation.y = -1.85 * track.doorOpen(t);

    const rem = Math.ceil(track.remaining(t) - 1e-6);
    m.display.draw(t >= track.T.powerOff ? 'End' : `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`);

    // thermal false-colour overlay
    const tv = track.thermalView(t);
    m.thermal.opacity = tv * 0.92;
    m.thermal.visible = tv > 0.002;
    if (tv > 0.002) {
      getHeatModel().sample(t, heatBuf);
      const data = m.heatTex.image.data as Uint8Array;
      for (let k = 0; k < heatBuf.length; k++) {
        const T = heatBuf[k];
        if (T < 0) {
          data[k * 4 + 3] = 0;
          continue;
        }
        thermalColor(T, 20, 100, col);
        data[k * 4] = Math.round(Math.pow(col.r, 1 / 2.2) * 255);
        data[k * 4 + 1] = Math.round(Math.pow(col.g, 1 / 2.2) * 255);
        data[k * 4 + 2] = Math.round(Math.pow(col.b, 1 / 2.2) * 255);
        data[k * 4 + 3] = 255;
      }
      m.heatTex.needsUpdate = true;
    }
  });

  const c = CAVITY;
  return (
    <group name="Microwave">
      {/* outer housing */}
      <Faded name="HousingTop" geometry={geo.top} material={m.housingSteel} ghost={m.ghost} />
      <Faded name="HousingBottom" geometry={geo.bottom} material={m.housingSteel} ghost={m.ghost} />
      <Faded name="HousingLeft" geometry={geo.left} material={m.housingSteel} ghost={m.ghost} />
      <Faded name="HousingRight" geometry={geo.right} material={m.housingSteel} ghost={m.ghost} />
      <Faded name="HousingBack" geometry={geo.back} material={m.housingSteel} ghost={m.ghost} />
      {geo.frame.map((g, i) => (
        <Faded key={i} name={`FrontFrame${i}`} geometry={g} material={m.housingSteel} ghost={m.ghost} />
      ))}
      <Faded name="ControlPanel" geometry={geo.panel} material={m.panelGlass} ghost={m.ghost} />
      {geo.feet.map((g, i) => (
        <mesh key={i} geometry={g} material={m.housingPlastic} renderOrder={11} />
      ))}
      <mesh name="Display" position={M.display} material={m.displayMat} renderOrder={13}>
        <planeGeometry args={[0.8, 0.3]} />
      </mesh>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((q) => (
          <mesh key={`${r}${q}`} name="Button" position={[1.28 + q * 0.32, 1.72 - r * 0.25, 1.765]} material={m.housingSteel} renderOrder={11}>
            <boxGeometry args={[0.24, 0.14, 0.02]} />
          </mesh>
        )),
      )}
      <mesh name="Knob" position={[1.6, 0.75, 1.8]} rotation-x={Math.PI / 2} material={m.housingSteel} renderOrder={11} castShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.12, 48]} />
      </mesh>

      {/* cooking cavity */}
      <Faded name="CavityBack" geometry={geo.cavBack} material={m.enamel} ghost={m.ghost} order={10} shadow={false} />
      <Faded name="CavityLeft" geometry={geo.cavLeft} material={m.enamel} ghost={m.ghost} order={10} shadow={false} />
      <Faded name="CavityRight" geometry={geo.cavRight} material={m.enamel} ghost={m.ghost} order={10} shadow={false} />
      <Faded name="CavityTop" geometry={geo.cavTop} material={m.enamel} ghost={m.ghost} order={10} shadow={false} />
      <Faded name="CavityFloor" geometry={geo.cavFloor} material={m.enamel} ghost={m.ghost} order={10} shadow={false} />
      <mesh name="WaveguideCover_Mica" geometry={geo.mica} material={m.mica} renderOrder={10} />
      <mesh name="CavityLamp" position={[c.min[0] + 0.25, c.max[1] - 0.25, c.min[2] + 0.2]} material={m.lamp}>
        <boxGeometry args={[0.2, 0.12, 0.02]} />
      </mesh>
      <pointLight ref={cavLight} position={[-0.6, 2.05, 0.4]} color="#ffdcae" intensity={0} distance={5} decay={1.6} />

      {/* turntable with bowl of soup */}
      <mesh name="TurntableRoller" geometry={geo.roller} position={[M.tableCenter.x, 0, 0]} material={m.plasticMatte} />
      <group ref={table} name="Turntable" position={[M.tableCenter.x, 0, 0]}>
        <mesh name="GlassPlate" geometry={geo.plate} material={m.glass} renderOrder={2} receiveShadow />
        <mesh name="Bowl" geometry={geo.bowl} material={m.ceramicWhite} castShadow receiveShadow />
        <mesh name="Soup" geometry={geo.soupDisc} material={m.soup} receiveShadow />
        <mesh name="ThermalOverlay" geometry={geo.thermalDisc} material={m.thermal} renderOrder={5} />
      </group>

      {/* waveguide */}
      <Cut name="WaveguideOuter" geometry={geo.wgOuter} material={m.steelCut} ghost={m.ghostCut} />
      <Cut name="WaveguideTop" geometry={geo.wgTop} material={m.steelCut} ghost={m.ghostCut} />
      <Cut name="WaveguideBottom" geometry={geo.wgBottom} material={m.steelCut} ghost={m.ghostCut} />
      <Cut name="WaveguideFront" geometry={geo.wgFront} material={m.steelCut} ghost={m.ghostCut} />
      <Cut name="WaveguideBack" geometry={geo.wgBack} material={m.steelCut} ghost={m.ghostCut} />

      {/* magnetron */}
      <group name="Magnetron">
        <Cut name="AnodeBlock" geometry={geo.anode} material={m.copperCut} ghost={m.ghostCut} />
        {geo.vanes.map((g, i) => (
          <mesh key={i} name={`Vane${i}`} geometry={g} material={m.copperCut} />
        ))}
        <mesh name="Cathode" geometry={geo.cathode} material={m.cathode} />
        {geo.fins.map((g, i) => (
          <Cut key={i} name={`CoolingFin${i}`} geometry={g} material={m.aluminiumCut} ghost={m.ghostCut} />
        ))}
        <Cut name="MagnetA" geometry={geo.magnetA} material={m.ferriteCut} ghost={m.ghostCut} />
        <Cut name="MagnetB" geometry={geo.magnetB} material={m.ferriteCut} ghost={m.ghostCut} />
        <Cut name="YokeA" geometry={geo.yokeA} material={m.zincCut} ghost={m.ghostCut} />
        <Cut name="YokeB" geometry={geo.yokeB} material={m.zincCut} ghost={m.ghostCut} />
        <mesh name="Antenna" geometry={geo.antenna} material={m.steel} />
        <mesh name="AntennaCap" geometry={geo.antennaCap} material={m.steel} />
        <Cut name="FilterBox" geometry={geo.filterBox} material={m.zincCut} ghost={m.ghostCut} />
      </group>

      {/* high voltage section */}
      <group name="HighVoltage">
        <mesh name="TransformerCore" geometry={geo.core} material={m.lamination} castShadow />
        <mesh name="TransformerCoil" geometry={geo.coil} material={m.copper} castShadow />
        <mesh name="HVCapacitor" geometry={geo.capacitor} material={m.steel} castShadow />
        <mesh name="HVDiode" geometry={geo.diode} material={m.plasticMatte} />
      </group>
      <group ref={fan} name="CoolingFan" position={M.fan}>
        <mesh geometry={geo.fanHub} material={m.plasticMatte} />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} geometry={geo.fanBlade} material={m.plasticMatte} rotation={[0.35, 0, (i / 5) * Math.PI * 2]} />
        ))}
      </group>

      {/* door, hinged on the left */}
      <group ref={door} name="Door" position={[M.body.min[0], 0, M.body.max[2]]}>
        <Faded name="DoorFrame" geometry={geo.doorFrame} material={m.housingPlastic} ghost={m.ghost} />
        <mesh name="DoorWindow" geometry={geo.doorWindow} material={m.doorWindow} renderOrder={11} />
        <mesh name="DoorHandle" geometry={geo.handle} material={m.housingSteel} renderOrder={11} castShadow />
      </group>
    </group>
  );
}
