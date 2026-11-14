import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SectionCut, createXRayMaterial } from '../../engine/components/cutaway';
import { surfaceNets } from '../../engine/geometry/surfaceNets';
import { lerp } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { AV_PLANE, HEART, HEART_BOUNDS, atrium, cutNormal, cutOffset, heartQuat, heartVertex, sdHeart, sdMuscle, ventricle } from './anatomy';
import { bodyVessels, branchGeometry, lungGeometry, lungVessels, skeletonGeometry, torsoGeometry } from './body';
import { createHeartGhost, createHeartMaterial, type BeatUniforms } from './materials';
import * as track from './script';
import { Valves } from './Valves';

/** shared beat uniforms (heart mesh, ghost, coronaries) */
export const beat: BeatUniforms = { uV: { value: 0 }, uA: { value: 0 } };
/** four-chamber section: keep = back half (solid), ghost = removed front half */
export const heartCut = new SectionCut(cutNormal.clone().negate());

let _heart: THREE.BufferGeometry | null = null;
export const heartGeometry = () => (_heart ??= surfaceNets(sdHeart, { ...HEART_BOUNDS, step: 0.0125, project: 1, attributes: { sizes: { color: 3, aBeat: 3 }, fill: heartVertex } }));

/** coronary arteries (red) and cardiac veins (blue) running on the epicardium, projected onto the surface */
export function coronaryGeometry() {
  const onSurface = (x: number, y: number, _front: number, r: number): THREE.Vector3 => {
    // march from in front of the heart towards its interior until the epicardium is reached
    const p = new THREE.Vector3(x, y, 0.6);
    const dir = new THREE.Vector3(x * 0.45, y, -0.05).sub(p).normalize();
    for (let i = 0; i < 300; i++) {
      const d = sdMuscle(p.x, p.y, p.z);
      if (d < r * 0.4) break;
      p.addScaledVector(dir, Math.min(0.04, Math.max(0.002, d * 0.8)));
    }
    return p;
  };
  const vessels: { pts: THREE.Vector3[]; r: number; venous: boolean }[] = [
    // left anterior descending artery in the anterior interventricular groove
    { pts: [[-0.03, 0.3], [-0.03, 0.12], [-0.01, -0.1], [0.04, -0.32], [0.12, -0.52]].map(([x, y]) => onSurface(x, y, 0, 0.016)), r: 0.016, venous: false },
    { pts: [[0.0, 0.3], [0.0, 0.12], [0.03, -0.1], [0.08, -0.3], [0.15, -0.5]].map(([x, y]) => onSurface(x, y, 0, 0.014)), r: 0.013, venous: true },
    // diagonal branch
    { pts: [[-0.02, 0.05], [0.1, -0.05], [0.22, -0.18]].map(([x, y]) => onSurface(x, y, 0, 0.011)), r: 0.011, venous: false },
    // right coronary artery in the right AV groove
    { pts: [[-0.08, 0.3], [-0.2, 0.26], [-0.32, 0.22], [-0.4, 0.15]].map(([x, y]) => onSurface(x, y, 0, 0.015)), r: 0.015, venous: false },
    // circumflex in the left AV groove
    { pts: [[0.08, 0.31], [0.24, 0.3], [0.36, 0.25], [0.42, 0.15]].map(([x, y]) => onSurface(x, y, 0, 0.013)), r: 0.013, venous: false },
  ];
  const geos = vessels.map((v) => {
    const c = new THREE.CatmullRomCurve3(v.pts, false, 'centripetal');
    const g = new THREE.TubeGeometry(c, 40, v.r, 7).toNonIndexed();
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const b = new Float32Array(n * 3);
    const cc = new THREE.Color(v.venous ? '#3a4f9e' : '#b3352c');
    for (let i = 0; i < n; i++) {
      const y = g.attributes.position.getY(i);
      col.set([cc.r, cc.g, cc.b], i * 3);
      b[i * 3] = 1 - THREE.MathUtils.smoothstep(y, AV_PLANE - 0.05, AV_PLANE + 0.07);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aBeat', new THREE.BufferAttribute(b, 3));
    return g;
  });
  return mergeGeometries(geos);
}

function useMaterials() {
  return useMemo(() => {
    const skin = new THREE.MeshPhysicalMaterial({ color: '#c08f78', roughness: 0.52, sheen: 0.5, sheenColor: new THREE.Color('#ffc8b0'), sheenRoughness: 0.6, clearcoat: 0.08, transparent: true });
    const skinGhost = createXRayMaterial('#7fc4ff');
    skinGhost.uniforms.uBase.value = 0.035;
    const bone = new THREE.MeshPhysicalMaterial({ color: '#e6dccb', roughness: 0.55, clearcoat: 0.2, transparent: true });
    const cartilage = new THREE.MeshPhysicalMaterial({ color: '#cfdcdc', roughness: 0.35, clearcoat: 0.4, transparent: true });
    const boneGhost = createXRayMaterial('#a9d8ff');
    boneGhost.uniforms.uBase.value = 0.02;
    const lung = createXRayMaterial('#ff9fb0');
    lung.uniforms.uBase.value = 0.05;
    lung.uniforms.uPower.value = 1.6;
    const lungFill = new THREE.MeshPhysicalMaterial({ color: '#d9828c', roughness: 0.7, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide });
    const heart = createHeartMaterial(beat, [heartCut.keep]);
    const ghost = createHeartGhost(beat, [heartCut.ghost]);
    const coronary = createHeartMaterial(beat, [heartCut.keep]);
    const art = new THREE.MeshPhysicalMaterial({ color: '#b3352c', roughness: 0.35, clearcoat: 0.5, emissive: '#5a0a07', emissiveIntensity: 0.35, transparent: true, depthWrite: false });
    const vein = new THREE.MeshPhysicalMaterial({ color: '#3d55b0', roughness: 0.35, clearcoat: 0.5, emissive: '#101858', emissiveIntensity: 0.35, transparent: true, depthWrite: false });
    const lungArt = vein.clone();
    const lungVein = art.clone();
    const plinth = new THREE.MeshPhysicalMaterial({ color: '#15171c', roughness: 0.35, metalness: 0.2, clearcoat: 0.6 });
    return { skin, skinGhost, bone, cartilage, boneGhost, lung, lungFill, heart, ghost, coronary, art, vein, lungArt, lungVein, plinth };
  }, []);
}

export function HeartModel() {
  const m = useMaterials();
  const geo = useMemo(() => {
    const sk = skeletonGeometry();
    const lv = lungVessels();
    const bv = bodyVessels();
    return {
      torso: torsoGeometry(),
      lungs: lungGeometry(),
      bone: sk.bone,
      cartilage: sk.cartilage,
      heart: heartGeometry(),
      coronary: coronaryGeometry(),
      lungArt: branchGeometry(lv, true),
      lungVein: branchGeometry(lv, false),
      art: branchGeometry(bv, false),
      vein: branchGeometry(bv, true),
    };
  }, []);

  useTimelineFrame((t) => {
    beat.uV.value = ventricle(t);
    beat.uA.value = atrium(t);
    const x = track.skinXray(t);
    m.skin.opacity = 1 - x;
    m.skin.visible = x < 0.999;
    m.skin.depthWrite = x < 0.5;
    m.skinGhost.uniforms.uOpacity.value = x * 0.55;
    const r = track.ribs(t);
    m.bone.opacity = r;
    m.cartilage.opacity = r;
    m.bone.visible = m.cartilage.visible = r > 0.002;
    m.bone.depthWrite = m.cartilage.depthWrite = r > 0.5;
    m.boneGhost.uniforms.uOpacity.value = track.ribsGhost(t) * 0.45;
    const l = track.lungs(t);
    m.lung.uniforms.uOpacity.value = l;
    m.lungFill.opacity = l * 0.22;
    const c = track.cut(t);
    const o = cutOffset();
    heartCut.set(lerp(o + 1.5, o, c));
    m.ghost.uniforms.uOpacity.value = track.heartGhost(t) * 0.5;
    const lvv = track.lungVessels(t);
    m.lungArt.opacity = m.lungVein.opacity = lvv * 0.9;
    m.lungArt.visible = m.lungVein.visible = lvv > 0.002;
    m.art.opacity = Math.max(0, track.arteriesBody(t)) * 0.7;
    m.vein.opacity = track.veinsBody(t) * 0.7;
    m.art.visible = m.art.opacity > 0.002;
    m.vein.visible = m.vein.opacity > 0.002;
  });

  return (
    <group name="HeartExplainer">
      <mesh name="Plinth" position={[0, -0.25, -0.05]} material={m.plinth} receiveShadow castShadow>
        <cylinderGeometry args={[1.75, 1.85, 0.5, 64]} />
      </mesh>
      <mesh name="Torso" geometry={geo.torso} material={m.skin} castShadow receiveShadow renderOrder={20} />
      <mesh name="TorsoXRay" geometry={geo.torso} material={m.skinGhost} renderOrder={21} />
      <mesh name="Bones" geometry={geo.bone} material={m.bone} castShadow renderOrder={4} />
      <mesh name="Cartilage" geometry={geo.cartilage} material={m.cartilage} renderOrder={4} />
      <mesh name="BonesXRay" geometry={geo.bone} material={m.boneGhost} renderOrder={19} />
      <mesh name="LungsFill" geometry={geo.lungs} material={m.lungFill} renderOrder={6} />
      <mesh name="Lungs" geometry={geo.lungs} material={m.lung} renderOrder={18} />
      <mesh name="LungArteries" geometry={geo.lungArt} material={m.lungArt} renderOrder={7} />
      <mesh name="LungVeins" geometry={geo.lungVein} material={m.lungVein} renderOrder={7} />
      <mesh name="BodyArteries" geometry={geo.art} material={m.art} renderOrder={8} />
      <mesh name="BodyVeins" geometry={geo.vein} material={m.vein} renderOrder={8} />
      <group name="Heart" position={HEART.position} quaternion={heartQuat}>
        <mesh name="Myocardium" geometry={geo.heart} material={m.heart} renderOrder={1} />
        <mesh name="Coronaries" geometry={geo.coronary} material={m.coronary} renderOrder={1} />
        <mesh name="HeartXRay" geometry={geo.heart} material={m.ghost} renderOrder={17} />
        <Valves keep={[heartCut.keep]} />
      </group>
    </group>
  );
}
