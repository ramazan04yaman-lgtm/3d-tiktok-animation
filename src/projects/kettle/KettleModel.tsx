import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SectionCut, createXRayMaterial } from '../../engine/components/cutaway';
import { Explode } from '../../engine/components/Explode';
import { glowColor, thermalColor } from '../../engine/effects/heat';
import { useTimelineFrame } from '../../engine/time';
import { wobble } from '../../engine/math';
import {
  DIM,
  baseStationGeometry,
  cableCurve,
  collarGeometry,
  elementCurve,
  glassGeometry,
  handleCurve,
  lidGeometry,
  skirtGeometry,
  steamDuctCurve,
  waterGeometry,
  waterSurfaceGeometry,
  wireLive,
  wireNeutral,
  wireToElement,
} from './geometry';
import * as track from './script';

export const section = new SectionCut(new THREE.Vector3(0, 0, -1));

function useMaterials() {
  return useMemo(() => {
    const clip = [section.keep];
    const steel = new THREE.MeshPhysicalMaterial({ name: 'BrushedSteel', color: '#c7cbd1', metalness: 1, roughness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.2, clippingPlanes: clip, side: THREE.DoubleSide, envMapIntensity: 1.2 });
    const darkSteel = new THREE.MeshStandardMaterial({ name: 'DarkSteel', color: '#8d939b', metalness: 1, roughness: 0.38 });
    const plastic = new THREE.MeshPhysicalMaterial({ name: 'GlossBlackPlastic', color: '#0f1013', roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25, clippingPlanes: clip, side: THREE.DoubleSide });
    const plasticMatte = new THREE.MeshStandardMaterial({ name: 'MatteBlackPlastic', color: '#17181c', roughness: 0.6, clippingPlanes: clip, side: THREE.DoubleSide });
    const glassFront = new THREE.MeshPhysicalMaterial({ name: 'BorosilicateGlass', color: '#eaf4ff', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false, side: THREE.FrontSide });
    const glassBack = glassFront.clone();
    glassBack.side = THREE.BackSide;
    glassBack.opacity = 0.1;
    const water = new THREE.MeshPhysicalMaterial({ name: 'Water', color: '#8fc4ff', roughness: 0.04, transparent: true, opacity: 0.22, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    const waterSurface = new THREE.MeshPhysicalMaterial({ name: 'WaterSurface', color: '#a8d2ff', roughness: 0.02, transparent: true, opacity: 0.35, envMapIntensity: 2.5, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 });
    const element = new THREE.MeshStandardMaterial({ name: 'HeatingElement', color: '#4a4e55', metalness: 0.85, roughness: 0.35, emissive: '#000000' });
    const plate = new THREE.MeshStandardMaterial({ name: 'HeatingPlate', color: '#b6bbc2', metalness: 1, roughness: 0.3, emissive: '#000000' });
    const copper = new THREE.MeshStandardMaterial({ name: 'Copper', color: '#c27a4a', metalness: 1, roughness: 0.3 });
    const wireBrown = new THREE.MeshStandardMaterial({ name: 'WireLive', color: '#6b3a1e', roughness: 0.5 });
    const wireBlue = new THREE.MeshStandardMaterial({ name: 'WireNeutral', color: '#1f4fa8', roughness: 0.5 });
    const silicone = new THREE.MeshPhysicalMaterial({ name: 'SiliconeDuct', color: '#f2f5f8', roughness: 0.4, transparent: true, opacity: 0.45, depthWrite: false });
    const bimetal = new THREE.MeshStandardMaterial({ name: 'Bimetal', color: '#d39a6a', metalness: 1, roughness: 0.25, emissive: '#000000', side: THREE.DoubleSide });
    const led = new THREE.MeshStandardMaterial({ name: 'LED', color: '#0b1a2a', emissive: '#2aa8ff', emissiveIntensity: 0 });
    const ghost = createXRayMaterial('#8fd0ff', [section.ghost]);
    return { steel, darkSteel, plastic, plasticMatte, glassFront, glassBack, water, waterSurface, element, plate, copper, wireBrown, wireBlue, silicone, bimetal, led, ghost };
  }, []);
}

type Mats = ReturnType<typeof useMaterials>;

/** A housing part that can be sectioned: solid clipped half + x-ray ghost of the removed half. */
function CutPart({ name, geometry, material, ghost }: { name: string; geometry: THREE.BufferGeometry; material: THREE.Material; ghost: THREE.Material }) {
  return (
    <group name={name}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh geometry={geometry} material={ghost} renderOrder={12} />
    </group>
  );
}

export function KettleModel() {
  const m = useMaterials();
  const geo = useMemo(() => {
    const element = elementCurve();
    return {
      base: baseStationGeometry(),
      skirt: skirtGeometry(),
      glassOuter: glassGeometry(0),
      water: waterGeometry(),
      surface: waterSurfaceGeometry(),
      collar: collarGeometry(),
      lid: lidGeometry(),
      handle: new THREE.TubeGeometry(handleCurve, 96, 0.088, 20, false),
      duct: new THREE.TubeGeometry(steamDuctCurve, 120, 0.032, 10, false),
      element: new THREE.TubeGeometry(element, 260, DIM.element.tube, 14, false),
      wireLive: new THREE.TubeGeometry(wireLive, 40, 0.014, 8, false),
      wireToElement: new THREE.TubeGeometry(wireToElement, 30, 0.014, 8, false),
      wireNeutral: new THREE.TubeGeometry(wireNeutral, 40, 0.014, 8, false),
      cable: new THREE.TubeGeometry(cableCurve, 80, 0.035, 10, false),
      controlBox: new THREE.BoxGeometry(0.36, 0.3, 0.34).translate(-0.98, 0.62, 0),
      surfaceBase: (waterSurfaceGeometry().attributes.position as THREE.BufferAttribute).array.slice() as Float32Array,
    };
  }, []);

  const lever = useRef<THREE.Group>(null);
  const disc = useRef<THREE.Mesh>(null);
  const pushrod = useRef<THREE.Mesh>(null);
  const movingContact = useRef<THREE.Mesh>(null);
  const heaterLight = useRef<THREE.PointLight>(null);
  const tmp = useMemo(() => ({ c: new THREE.Color(), c2: new THREE.Color(), natural: new THREE.Color('#8fc4ff') }), []);

  useTimelineFrame((t) => {
    // --- section cut: plane sweeps from in front of the kettle to its mid-plane
    const k = track.cut(t);
    section.set(k < 0.0005 ? 100 : THREE.MathUtils.lerp(1.6, 0.0, k));
    m.ghost.uniforms.uOpacity.value = k * 0.55;

    // --- heat glow on element & plate (visual exaggeration, see README)
    const h = track.elementHeat(t);
    glowColor(h, m.element.emissive);
    m.element.emissiveIntensity = h * 2.2;
    glowColor(h * 0.6, m.plate.emissive);
    m.plate.emissiveIntensity = h * 0.35;
    if (heaterLight.current) heaterLight.current.intensity = h * 2.2;

    // --- water: natural tint ↔ thermal false colour
    const tv = track.thermalView(t);
    const temp = track.waterTemp(t);
    thermalColor(temp, 20, 100, tmp.c);
    m.water.color.copy(tmp.natural).lerp(tmp.c, tv);
    m.water.emissive.copy(tmp.c).multiplyScalar(tv * 0.22);
    m.water.opacity = 0.22 + tv * 0.08;
    m.waterSurface.color.copy(m.water.color);

    // --- surface ripples (sum of travelling sines, amplitude from boiling)
    const amp = track.surfaceAgitation(t) * 0.022;
    const pos = geo.surface.attributes.position as THREE.BufferAttribute;
    const b = geo.surfaceBase;
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3];
      const z = b[i * 3 + 2];
      const r = Math.hypot(x, z);
      const edge = Math.min(1, (0.72 - r) / 0.12);
      const y = amp * edge * (wobble(t * 7 + x * 11, z * 3) + 0.6 * Math.sin(t * 13 - r * 30 + z * 5) * wobble(t * 3, x));
      pos.setY(i, DIM.waterTop + y);
    }
    pos.needsUpdate = true;
    geo.surface.computeVertexNormals();

    // --- switch, LED, bimetal snap, contacts
    const sp = track.switchPos(t);
    if (lever.current) lever.current.rotation.z = THREE.MathUtils.lerp(0.28, -0.12, sp);
    m.led.emissiveIntensity = sp * 6;
    const sn = track.snap(t);
    if (disc.current) disc.current.scale.y = THREE.MathUtils.lerp(1, -1, sn);
    if (pushrod.current) pushrod.current.position.y = DIM.bimetal.y - 0.11 - sn * 0.035;
    if (movingContact.current) movingContact.current.position.y = DIM.contact.y + 0.012 - (1 - sp) * 0.04;
    const bh = track.bimetalHeat(t);
    glowColor(bh * 0.7, m.bimetal.emissive);
    m.bimetal.emissiveIntensity = bh * 0.9;
  });

  return (
    <group name="Kettle">
      {/* Power base on the table (static) */}
      <group name="PowerBase">
        <CutPart name="BaseStation" geometry={geo.base} material={m.plasticMatte} ghost={m.ghost} />
        <mesh name="Cable" geometry={geo.cable} material={m.plasticMatte} castShadow />
        <mesh name="BaseSocket" position={[0, 0.215, 0]} material={m.darkSteel}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 24]} />
        </mesh>
      </group>

      {/* Everything that lifts off the base */}
      <Explode offset={[0, 0.95, 0]} amount={track.explode}>
        <group name="KettleBody">
          <Explode offset={[0, -0.5, 0]} amount={track.explode}>
            <CutPart name="Skirt" geometry={geo.skirt} material={m.steel} ghost={m.ghost} />
          </Explode>

          <group name="Connector">
            <mesh position={[0, 0.215, 0]} material={m.plasticMatte}>
              <cylinderGeometry args={[0.13, 0.14, 0.09, 32, 1, true]} />
            </mesh>
            <mesh position={[0, 0.215, 0]} material={m.copper}>
              <torusGeometry args={[0.085, 0.012, 8, 32]} />
            </mesh>
          </group>

          {/* Concealed heating: stainless plate with brazed tubular element below */}
          <group name="HeatingAssembly">
            <mesh name="HeatingPlate" position={[0, DIM.plateY + 0.0125, 0]} material={m.plate} castShadow receiveShadow>
              <cylinderGeometry args={[0.79, 0.79, 0.025, 96]} />
            </mesh>
            <mesh name="HeatingElement" geometry={geo.element} material={m.element} castShadow />
            <pointLight ref={heaterLight} position={[0, 0.38, 0]} color="#ff6a2a" intensity={0} distance={2.2} decay={2} />
          </group>

          <mesh name="WireLive" geometry={geo.wireLive} material={m.wireBrown} />
          <mesh name="WireToElement" geometry={geo.wireToElement} material={m.wireBrown} />
          <mesh name="WireNeutral" geometry={geo.wireNeutral} material={m.wireBlue} />

          {/* Glass body (back faces first, water, then front faces) */}
          <mesh name="GlassBack" geometry={geo.glassOuter} material={m.glassBack} renderOrder={1} />
          <mesh name="Water" geometry={geo.water} material={m.water} renderOrder={3} />
          <mesh name="WaterSurface" geometry={geo.surface} material={m.waterSurface} renderOrder={4} />
          <mesh name="GlassFront" geometry={geo.glassOuter} material={m.glassFront} renderOrder={10} />
          {[0.85, 1.15, 1.45].map((y) => (
            <mesh key={y} name={`ScaleMark_${y}`} position={[0, y, 0]} rotation-y={-0.35} renderOrder={11}>
              <torusGeometry args={[0.81 - (0.08 * (y - 0.5)) / 1.48 - 0.008, 0.004, 4, 24, 0.35]} />
              <meshBasicMaterial color="#dfe9f5" transparent opacity={0.6} />
            </mesh>
          ))}

          <CutPart name="Collar" geometry={geo.collar} material={m.steel} ghost={m.ghost} />
          <CutPart name="Lid" geometry={geo.lid} material={m.steel} ghost={m.ghost} />
          <mesh name="LidKnob" position={[-0.22, 2.33, 0]} rotation-z={Math.PI / 2} material={m.plastic} castShadow>
            <capsuleGeometry args={[0.05, 0.22, 6, 16]} />
          </mesh>
          <CutPart name="Handle" geometry={geo.handle} material={m.plastic} ghost={m.ghost} />
          <mesh name="SteamDuct" geometry={geo.duct} material={m.silicone} renderOrder={9} />

          {/* Control unit at the base of the handle (Strix-type steam control, simplified) */}
          <group name="ControlUnit">
            <CutPart name="ControlHousing" geometry={geo.controlBox} material={m.plastic} ghost={m.ghost} />
            <mesh ref={disc} name="BimetalDisc" position={DIM.bimetal} material={m.bimetal} castShadow>
              <sphereGeometry args={[0.2, 32, 8, 0, Math.PI * 2, 0, 0.55]} />
            </mesh>
            <mesh name="BimetalSeat" position={[DIM.bimetal.x, DIM.bimetal.y - 0.005, 0]} material={m.darkSteel}>
              <torusGeometry args={[0.085, 0.008, 8, 32]} />
            </mesh>
            <mesh ref={pushrod} name="Pushrod" position={[DIM.bimetal.x, DIM.bimetal.y - 0.11, 0]} material={m.darkSteel}>
              <cylinderGeometry args={[0.012, 0.012, 0.17, 12]} />
            </mesh>
            <mesh name="FixedContact" position={[DIM.contact.x, DIM.contact.y - 0.012, DIM.contact.z]} material={m.copper}>
              <boxGeometry args={[0.07, 0.016, 0.05]} />
            </mesh>
            <mesh ref={movingContact} name="MovingContact" position={[DIM.contact.x, DIM.contact.y + 0.012, DIM.contact.z]} material={m.copper}>
              <boxGeometry args={[0.07, 0.016, 0.05]} />
            </mesh>
            <group ref={lever} name="RockerSwitch" position={DIM.switchPivot}>
              <mesh position={[-0.02, 0, 0]} material={m.plastic} castShadow>
                <boxGeometry args={[0.07, 0.2, 0.16]} />
              </mesh>
            </group>
            <mesh name="PowerLED" position={[-1.05, 0.52, 0.172]} material={m.led}>
              <sphereGeometry args={[0.022, 16, 12]} />
            </mesh>
          </group>
        </group>
      </Explode>
    </group>
  );
}

export type { Mats };
