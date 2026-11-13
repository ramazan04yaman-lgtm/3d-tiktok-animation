import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SectionCut, createXRayMaterial } from '../../engine/components/cutaway';
import { glowColor } from '../../engine/effects/heat';
import { getCremaTexture, getGroundsTexture, getPressureDialTexture } from '../../engine/effects/textures';
import { lerp } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import {
  P,
  blockHelix,
  cableCurve,
  cupGeometry,
  cupHandleCurve,
  cupInnerRadius,
  pipeBlockToGroup,
  pipePumpToBlock,
  pipeTankToPump,
  portafilterGeometry,
  roundedBox,
  saucerGeometry,
  steamWandCurve,
} from './geometry';
import * as track from './script';

/** Section through pump + thermoblock (their axis lies at z = −0.55) */
export const internalSection = new SectionCut(new THREE.Vector3(0, 0, -1));
/** Section through group head, portafilter and puck (z = 0.45) */
export const groupSection = new SectionCut(new THREE.Vector3(0, 0, -1));

/** Same material recipes as the kettle episode → identical series look. */
function useMaterials() {
  return useMemo(() => {
    const inCut = [internalSection.keep];
    const gCut = [groupSection.keep];
    const steelRecipe = { color: '#c7cbd1', metalness: 1, roughness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.2 };
    const housingSteel = new THREE.MeshPhysicalMaterial({ name: 'BrushedSteel', ...steelRecipe, transparent: true });
    const housingPlastic = new THREE.MeshPhysicalMaterial({ name: 'GlossBlackPlastic', color: '#0f1013', roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true });
    const plasticMatte = new THREE.MeshStandardMaterial({ name: 'MatteBlackPlastic', color: '#17181c', roughness: 0.6 });
    const chrome = new THREE.MeshPhysicalMaterial({ name: 'Chrome', color: '#e4e7eb', metalness: 1, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.6, clippingPlanes: gCut, side: THREE.DoubleSide });
    const steelCut = new THREE.MeshPhysicalMaterial({ name: 'Steel', ...steelRecipe, clippingPlanes: gCut, side: THREE.DoubleSide });
    const steel = new THREE.MeshPhysicalMaterial({ name: 'Steel', ...steelRecipe });
    const darkSteel = new THREE.MeshStandardMaterial({ name: 'DarkSteel', color: '#8d939b', metalness: 1, roughness: 0.38 });
    const aluminium = new THREE.MeshPhysicalMaterial({ name: 'Aluminium', color: '#b9bec6', metalness: 1, roughness: 0.42, clippingPlanes: inCut, side: THREE.DoubleSide, emissive: '#000000' });
    const copper = new THREE.MeshStandardMaterial({ name: 'CopperCoil', color: '#c27a4a', metalness: 1, roughness: 0.3, clippingPlanes: inCut, side: THREE.DoubleSide });
    const pumpPlastic = new THREE.MeshStandardMaterial({ name: 'PumpBody', color: '#22252b', roughness: 0.45, clippingPlanes: inCut, side: THREE.DoubleSide });
    const heater = new THREE.MeshStandardMaterial({ name: 'HeatingElement', color: '#4a4e55', metalness: 0.85, roughness: 0.35, emissive: '#000000', clippingPlanes: inCut });
    const piston = new THREE.MeshStandardMaterial({ name: 'Piston', color: '#d9dde3', metalness: 1, roughness: 0.2 });
    const glass = new THREE.MeshPhysicalMaterial({ name: 'TankPlastic', color: '#eaf4ff', roughness: 0.03, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false, side: THREE.DoubleSide });
    const water = new THREE.MeshPhysicalMaterial({ name: 'Water', color: '#8fc4ff', roughness: 0.04, transparent: true, opacity: 0.22, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    const silicone = new THREE.MeshPhysicalMaterial({ name: 'SiliconeTube', color: '#f2f5f8', roughness: 0.4, transparent: true, opacity: 0.4, depthWrite: false });
    const channel = new THREE.MeshPhysicalMaterial({ name: 'WaterChannel', color: '#f2f5f8', roughness: 0.4, transparent: true, opacity: 0.35, depthWrite: false, clippingPlanes: inCut });
    const ceramic = new THREE.MeshPhysicalMaterial({ name: 'Ceramic', color: '#f4f2ee', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 });
    const grounds = new THREE.MeshStandardMaterial({ name: 'CoffeeGrounds', color: '#ffffff', map: getGroundsTexture(), roughness: 0.9, clippingPlanes: gCut, side: THREE.DoubleSide });
    const wetGrounds = new THREE.MeshStandardMaterial({ name: 'WetGrounds', color: '#5a3a24', map: getGroundsTexture(), roughness: 0.5, clippingPlanes: gCut, side: THREE.DoubleSide });
    const hotWater = new THREE.MeshPhysicalMaterial({ name: 'HotWater', color: '#ff9a5a', roughness: 0.05, transparent: true, opacity: 0.45, emissive: '#ff6a2a', emissiveIntensity: 0.25, clippingPlanes: gCut, side: THREE.DoubleSide, depthWrite: false });
    const cremaMat = new THREE.MeshPhysicalMaterial({ name: 'Crema', color: '#3a2010', map: getCremaTexture(), roughness: 0.35, clearcoat: 0.6 });
    const dial = new THREE.MeshStandardMaterial({ name: 'GaugeDial', map: getPressureDialTexture(), roughness: 0.3 });
    const needle = new THREE.MeshStandardMaterial({ name: 'GaugeNeedle', color: '#d22b1f', roughness: 0.4 });
    const gaugeGlass = new THREE.MeshPhysicalMaterial({ name: 'GaugeGlass', color: '#ffffff', roughness: 0, transparent: true, opacity: 0.12, clearcoat: 1, envMapIntensity: 2 });
    const ledPower = new THREE.MeshStandardMaterial({ name: 'LEDPower', color: '#0b1a2a', emissive: '#2aa8ff', emissiveIntensity: 0 });
    const ledBrew = new THREE.MeshStandardMaterial({ name: 'LEDBrew', color: '#0b1a2a', emissive: '#2aa8ff', emissiveIntensity: 0 });
    const ghost = createXRayMaterial('#8fd0ff', []);
    const ghostIn = createXRayMaterial('#8fd0ff', [internalSection.ghost]);
    const ghostGroup = createXRayMaterial('#8fd0ff', [groupSection.ghost]);
    return { housingSteel, housingPlastic, plasticMatte, chrome, steel, steelCut, darkSteel, aluminium, copper, pumpPlastic, heater, piston, glass, water, silicone, channel, ceramic, grounds, wetGrounds, hotWater, cremaMat, dial, needle, gaugeGlass, ledPower, ledBrew, ghost, ghostIn, ghostGroup };
  }, []);
}

/** Housing panel: solid part fades out while its x-ray ghost fades in. */
function Housing({ geometry, material, ghost, name }: { geometry: THREE.BufferGeometry; material: THREE.Material; ghost: THREE.Material; name: string }) {
  return (
    <group name={name}>
      {/* drawn after the inner transparent parts (tank, water, tubes) so a fading housing really covers them */}
      <mesh geometry={geometry} material={material} castShadow receiveShadow renderOrder={11} />
      <mesh geometry={geometry} material={ghost} renderOrder={12} />
    </group>
  );
}

/** A sectionable inner part: clipped solid + ghost of the removed half. */
function Cut({ geometry, material, ghost, name, ...rest }: { geometry: THREE.BufferGeometry; material: THREE.Material; ghost: THREE.Material; name: string } & JSX.IntrinsicElements['group']) {
  return (
    <group name={name} {...rest}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh geometry={geometry} material={ghost} renderOrder={12} />
    </group>
  );
}

export function EspressoModel() {
  const m = useMaterials();
  const geo = useMemo(() => {
    const pressureSide = new THREE.TubeGeometry(pipePumpToBlock, 40, 0.03, 10);
    return {
      plinth: roundedBox(P.plinth.s, P.plinth.c, 0.1),
      tower: roundedBox(P.tower.s, P.tower.c, 0.14),
      head: roundedBox(P.head.s, P.head.c, 0.14),
      tank: roundedBox(P.tank.s, P.tank.c, 0.06),
      grate: roundedBox([1.66, 0.03, 1.04], [0, 0.4, 0.6], 0.012),
      portafilter: portafilterGeometry(),
      groupHead: new THREE.CylinderGeometry(0.37, 0.39, 0.17, 64).translate(P.group.x, P.group.y, P.group.z),
      groupCollar: new THREE.TorusGeometry(0.37, 0.025, 12, 64).rotateX(Math.PI / 2).translate(P.group.x, 2.135, P.group.z),
      shower: new THREE.CylinderGeometry(0.29, 0.29, 0.012, 64).translate(P.group.x, 2.123, P.group.z),
      puck: new THREE.CylinderGeometry(0.295, 0.295, 1, 64).translate(0, 0.5, 0),
      waterLayer: new THREE.CylinderGeometry(0.295, 0.295, 1, 64).translate(0, 0.5, 0),
      spoutBlock: roundedBox([0.3, 0.1, 0.14], [0, 1.79, P.group.z], 0.03),
      spoutL: new THREE.CylinderGeometry(0.025, 0.035, 0.06, 16).translate(-0.07, P.spoutY + 0.03, P.group.z),
      spoutR: new THREE.CylinderGeometry(0.025, 0.035, 0.06, 16).translate(0.07, P.spoutY + 0.03, P.group.z),
      handle: new THREE.CapsuleGeometry(0.075, 0.75, 8, 20),
      cup: cupGeometry(),
      saucer: saucerGeometry(),
      cupHandle: new THREE.TubeGeometry(cupHandleCurve, 40, 0.035, 12),
      pipeIn: new THREE.TubeGeometry(pipeTankToPump, 40, 0.03, 10),
      pipeMid: pressureSide,
      pipeOut: new THREE.TubeGeometry(pipeBlockToGroup, 60, 0.03, 10),
      pumpCoil: new THREE.CylinderGeometry(0.15, 0.15, 0.34, 40).rotateZ(Math.PI / 2).translate(P.pump.x, P.pump.y, P.pump.z),
      pumpBody: new THREE.CylinderGeometry(0.11, 0.11, 0.76, 32).rotateZ(Math.PI / 2).translate(P.pump.x, P.pump.y, P.pump.z),
      block: new THREE.CylinderGeometry(0.21, 0.21, P.blockH, 64, 1).translate(P.block.x, P.block.y, P.block.z),
      blockChannel: new THREE.TubeGeometry(blockHelix(0.1, 5), 300, 0.028, 8),
      blockHeater: new THREE.TubeGeometry(blockHelix(0.165, 5, Math.PI), 300, 0.022, 8),
      steamWand: new THREE.TubeGeometry(steamWandCurve, 40, 0.028, 12),
      cable: new THREE.TubeGeometry(cableCurve, 60, 0.035, 10),
      crema: new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2),
    };
  }, []);

  const pumpGroup = useRef<THREE.Group>(null);
  const pistonRef = useRef<THREE.Mesh>(null);
  const needleRef = useRef<THREE.Group>(null);
  const powerBtnRef = useRef<THREE.Mesh>(null);
  const brewBtnRef = useRef<THREE.Mesh>(null);
  const tankWater = useRef<THREE.Mesh>(null);
  const puckDry = useRef<THREE.Mesh>(null);
  const puckWet = useRef<THREE.Mesh>(null);
  const layer = useRef<THREE.Mesh>(null);
  const cremaRef = useRef<THREE.Mesh>(null);
  const blockLight = useRef<THREE.PointLight>(null);
  const tmp = useMemo(() => ({ dark: new THREE.Color('#3a2010'), white: new THREE.Color('#ffffff') }), []);

  useTimelineFrame((t) => {
    // housing x-ray crossfade
    const x = track.xray(t);
    for (const mat of [m.housingSteel, m.housingPlastic]) {
      mat.opacity = 1 - x;
      const tr = x > 0.001;
      if (mat.transparent !== tr) {
        mat.transparent = tr;
        mat.needsUpdate = true;
      }
      mat.depthWrite = !tr;
      mat.visible = x < 0.999;
    }
    m.ghost.uniforms.uOpacity.value = x * 0.6;

    // sections
    const ic = track.internalCut(t);
    internalSection.set(ic < 0.0005 ? 100 : lerp(-0.1, -0.55, ic));
    m.ghostIn.uniforms.uOpacity.value = ic * 0.55;
    const gc = track.groupCut(t);
    groupSection.set(gc < 0.0005 ? 100 : lerp(1.0, 0.45, gc));
    m.ghostGroup.uniforms.uOpacity.value = gc * 0.55;

    // buttons + LEDs
    if (powerBtnRef.current) powerBtnRef.current.position.z = P.powerBtn.z + 0.03 - track.powerButton(t) * 0.025;
    if (brewBtnRef.current) brewBtnRef.current.position.z = P.brewBtn.z + 0.03 - track.brewButton(t) * 0.025;
    m.ledPower.emissiveIntensity = track.power(t) * 6;
    m.ledBrew.emissiveIntensity = track.pumping(t) * 6;

    // pump: slowed-down piston stroke + tiny housing vibration
    const pu = track.pumping(t);
    if (pistonRef.current) pistonRef.current.position.x = P.pump.x + track.pumpPiston(t) * 0.07;
    if (pumpGroup.current) pumpGroup.current.position.set(Math.sin(t * 157) * 0.0025 * pu, Math.cos(t * 131) * 0.0015 * pu, 0);

    // gauge needle: 0 bar at −135°, 16 bar at +135° (clockwise)
    if (needleRef.current) needleRef.current.rotation.z = THREE.MathUtils.degToRad(135 - (track.pressure(t) / 16) * 270);

    // thermoblock glow (false colour exaggeration)
    const h = track.blockHeat(t);
    glowColor(h, m.heater.emissive);
    m.heater.emissiveIntensity = h * 2.2;
    glowColor(h * 0.5, m.aluminium.emissive);
    m.aluminium.emissiveIntensity = h * 0.15;
    if (blockLight.current) blockLight.current.intensity = h * 1.6 * track.xray(t);

    // tank water level
    if (tankWater.current) {
      const top = track.tankLevel(t);
      const bottom = 0.56;
      tankWater.current.scale.y = top - bottom;
      tankWater.current.position.y = bottom;
    }

    // puck: wetting front moves down from the top
    const puckBottom = 1.89;
    const puckTop = 1.985;
    const w = track.wetting(t);
    const hWet = (puckTop - puckBottom) * w;
    if (puckWet.current) {
      puckWet.current.visible = hWet > 0.001;
      puckWet.current.position.y = puckTop - hWet;
      puckWet.current.scale.y = Math.max(hWet, 0.0001);
    }
    if (puckDry.current) {
      puckDry.current.position.y = puckBottom;
      puckDry.current.scale.y = Math.max(puckTop - puckBottom - hWet, 0.0001);
      puckDry.current.visible = w < 0.999;
    }
    if (layer.current) {
      const lh = 0.11 * track.waterLayer(t);
      layer.current.visible = lh > 0.002;
      layer.current.position.y = puckTop + 0.002;
      layer.current.scale.y = Math.max(lh, 0.0001);
    }

    // cup: coffee surface rises, crema develops
    const f = track.cupFill(t);
    if (cremaRef.current) {
      const y = P.cup.y - 0.41 + lerp(P.cupInnerBottom + 0.005, P.cupFullY, f);
      const r = cupInnerRadius(y - (P.cup.y - 0.41)) - 0.004;
      cremaRef.current.visible = f > 0.002;
      cremaRef.current.position.set(P.cup.x, y, P.cup.z);
      cremaRef.current.scale.set(r, 1, r);
      cremaRef.current.rotation.y = t * 0.05;
      m.cremaMat.color.copy(tmp.dark).lerp(tmp.white, track.crema(t));
    }
  });

  return (
    <group name="EspressoMachine">
      {/* Housing (fades to x-ray) */}
      <Housing name="Plinth" geometry={geo.plinth} material={m.housingPlastic} ghost={m.ghost} />
      <Housing name="Tower" geometry={geo.tower} material={m.housingSteel} ghost={m.ghost} />
      <Housing name="Head" geometry={geo.head} material={m.housingSteel} ghost={m.ghost} />
      <group name="DripGrate">
        <mesh geometry={geo.grate} material={m.darkSteel} receiveShadow />
        {Array.from({ length: 11 }, (_, i) => (
          <mesh key={i} position={[-0.75 + i * 0.15, 0.426, 0.6]} material={m.steel} castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.02, 0.96]} />
          </mesh>
        ))}
      </group>
      <mesh name="Cable" geometry={geo.cable} material={m.plasticMatte} castShadow />

      {/* Front panel: buttons with LEDs, pressure gauge */}
      <mesh ref={powerBtnRef} name="PowerButton" position={[P.powerBtn.x, P.powerBtn.y, P.powerBtn.z]} rotation-x={Math.PI / 2} material={m.steel} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 40]} />
      </mesh>
      <mesh name="PowerLED" position={[P.powerBtn.x, P.powerBtn.y, P.powerBtn.z + 0.005]} material={m.ledPower}>
        <torusGeometry args={[0.12, 0.012, 8, 40]} />
      </mesh>
      <mesh ref={brewBtnRef} name="BrewButton" position={[P.brewBtn.x, P.brewBtn.y, P.brewBtn.z]} rotation-x={Math.PI / 2} material={m.steel} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 40]} />
      </mesh>
      <mesh name="BrewLED" position={[P.brewBtn.x, P.brewBtn.y, P.brewBtn.z + 0.005]} material={m.ledBrew}>
        <torusGeometry args={[0.12, 0.012, 8, 40]} />
      </mesh>
      <group name="PressureGauge" position={[P.gauge.x, P.gauge.y, P.gauge.z]}>
        <mesh material={m.chrome} rotation-x={Math.PI / 2} position-z={0.02}>
          <cylinderGeometry args={[0.25, 0.25, 0.05, 64, 1, true]} />
        </mesh>
        <mesh material={m.steel} position-z={0.045}>
          <torusGeometry args={[0.245, 0.022, 12, 64]} />
        </mesh>
        <mesh material={m.dial} position-z={0.005}>
          <circleGeometry args={[0.23, 64]} />
        </mesh>
        <group ref={needleRef} position-z={0.02}>
          <mesh material={m.needle} position-y={0.08}>
            <boxGeometry args={[0.012, 0.18, 0.006]} />
          </mesh>
          <mesh material={m.darkSteel}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 20]} />
          </mesh>
        </group>
        <mesh material={m.gaugeGlass} position-z={0.04} renderOrder={11}>
          <circleGeometry args={[0.235, 64]} />
        </mesh>
      </group>
      <mesh name="SteamWand" geometry={geo.steamWand} material={m.steel} castShadow />
      <mesh name="SteamKnob" position={[1.18, 2.72, 1.04]} rotation-x={Math.PI / 2} material={m.housingPlastic}>
        <cylinderGeometry args={[0.11, 0.12, 0.1, 32]} />
      </mesh>

      {/* Water tank */}
      <group name="WaterTank">
        <mesh geometry={geo.tank} material={m.glass} renderOrder={2} />
        <mesh ref={tankWater} position={[P.tank.c[0], 0.56, P.tank.c[2]]} material={m.water} renderOrder={3}>
          <boxGeometry args={[P.tank.s[0] - 0.08, 1, P.tank.s[2] - 0.08]} />
        </mesh>
      </group>

      {/* Pipes */}
      <mesh name="PipeTankToPump" geometry={geo.pipeIn} material={m.silicone} renderOrder={9} />
      <mesh name="PipePumpToBlock" geometry={geo.pipeMid} material={m.silicone} renderOrder={9} />
      <mesh name="PipeBlockToGroup" geometry={geo.pipeOut} material={m.silicone} renderOrder={9} />

      {/* Vibration pump */}
      <group ref={pumpGroup} name="VibrationPump">
        <Cut name="PumpBody" geometry={geo.pumpBody} material={m.pumpPlastic} ghost={m.ghostIn} />
        <Cut name="PumpCoil" geometry={geo.pumpCoil} material={m.copper} ghost={m.ghostIn} />
        <mesh ref={pistonRef} name="Piston" position={[P.pump.x, P.pump.y, P.pump.z]} rotation-z={Math.PI / 2} material={m.piston}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 24]} />
        </mesh>
      </group>

      {/* Thermoblock */}
      <group name="Thermoblock">
        <Cut name="ThermoblockBody" geometry={geo.block} material={m.aluminium} ghost={m.ghostIn} />
        <mesh name="WaterChannel" geometry={geo.blockChannel} material={m.channel} renderOrder={9} />
        <mesh name="HeatingElement" geometry={geo.blockHeater} material={m.heater} />
        <pointLight ref={blockLight} position={[P.block.x, P.block.y, P.block.z + 0.3]} color="#ff6a2a" intensity={0} distance={2} decay={2} />
      </group>

      {/* Group head + portafilter (sectionable) */}
      <group name="BrewGroup">
        <Cut name="GroupHead" geometry={geo.groupHead} material={m.chrome} ghost={m.ghostGroup} />
        <mesh name="GroupGasket" geometry={geo.groupCollar} material={m.darkSteel} />
        <mesh name="ShowerScreen" geometry={geo.shower} material={m.steelCut} />
        <Cut name="Portafilter" geometry={geo.portafilter} material={m.chrome} ghost={m.ghostGroup} position={[P.group.x, 0, P.group.z]} />
        <mesh name="PortafilterHandle" geometry={geo.handle} material={m.housingPlastic} position={[-0.32, 1.95, 1.12]} rotation={[Math.PI / 2 - 0.08, 0, Math.PI / 6]} castShadow />
        <mesh ref={puckDry} name="CoffeePuck" geometry={geo.puck} material={m.grounds} position={[P.group.x, 1.89, P.group.z]} />
        <mesh ref={puckWet} name="CoffeePuckWet" geometry={geo.puck} material={m.wetGrounds} position={[P.group.x, 1.9, P.group.z]} />
        <mesh ref={layer} name="HotWaterLayer" geometry={geo.waterLayer} material={m.hotWater} position={[P.group.x, 1.99, P.group.z]} renderOrder={4} />
        <mesh name="SpoutBlock" geometry={geo.spoutBlock} material={m.chrome} castShadow />
        <mesh name="SpoutL" geometry={geo.spoutL} material={m.chrome} />
        <mesh name="SpoutR" geometry={geo.spoutR} material={m.chrome} />
      </group>

      {/* Cup on saucer */}
      <group name="Cup" position={[P.cup.x, P.cup.y - 0.41, P.cup.z]}>
        <mesh name="Saucer" geometry={geo.saucer} material={m.ceramic} castShadow receiveShadow />
        <mesh name="CupBody" geometry={geo.cup} material={m.ceramic} castShadow receiveShadow />
        <mesh name="CupHandle" geometry={geo.cupHandle} material={m.ceramic} castShadow />
      </group>
      <mesh ref={cremaRef} name="CoffeeSurface" geometry={geo.crema} material={m.cremaMat} receiveShadow />
    </group>
  );
}
