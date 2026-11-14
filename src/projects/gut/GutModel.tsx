import { useMemo } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { lerp } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { ANAL, COLON_S, S } from './anatomy';
import { colonRingState, smallRingState } from './gas';
import { createGutMaterial, gutUniforms } from './materials';
import {
  appendixGeometry,
  bladderGeometry,
  bodyGeometry,
  boneGeometry,
  canalGeometry,
  canalQuat,
  colonGeometry,
  esophagusGeometry,
  liverGeometry,
  puborectalisGeometry,
  smallGeometry,
  sphincterGeometry,
  stomachGeometry,
} from './organs';
import * as track from './script';

/** shared uniforms (driven per frame, also read by the contents) */
export const gutU = {
  eso: gutUniforms('#b8574f', 90),
  stomach: gutUniforms('#c0524b', 55),
  small: gutUniforms('#cf6a5d', 75),
  colon: gutUniforms('#b6655a', (Math.PI * 2) / 0.32),
  canal: gutUniforms('#c46d66', 120),
};
/** sagittal section for the sphincters (keep the patient's right half, camera on the left) */
export const sagittal = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100);

function useMaterials() {
  return useMemo(() => {
    const skin = new THREE.MeshPhysicalMaterial({ color: '#c39380', roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#ffc9b2'), sheenRoughness: 0.6, clearcoat: 0.08, transparent: true });
    const skinGhost = createXRayMaterial('#7fc4ff');
    skinGhost.uniforms.uBase.value = 0.03;
    const boneGhost = createXRayMaterial('#b5dcff');
    boneGhost.uniforms.uBase.value = 0.02;
    const boneFill = new THREE.MeshPhysicalMaterial({ color: '#e7dfcf', roughness: 0.55, transparent: true, opacity: 0, depthWrite: false });
    const liver = createXRayMaterial('#ff9f80');
    liver.uniforms.uBase.value = 0.04;
    const liverFill = new THREE.MeshPhysicalMaterial({ color: '#7a2f22', roughness: 0.4, clearcoat: 0.5, transparent: true, opacity: 0, depthWrite: false });
    const bladder = createXRayMaterial('#ffe0a0');
    bladder.uniforms.uBase.value = 0.03;
    const eso = createGutMaterial(gutU.eso);
    const stomach = createGutMaterial(gutU.stomach);
    const small = createGutMaterial(gutU.small);
    const colon = createGutMaterial(gutU.colon);
    const canal = createGutMaterial(gutU.canal, { canal: true });
    const internal = new THREE.MeshPhysicalMaterial({ color: '#d98c80', roughness: 0.45, clearcoat: 0.4, sheen: 0.4, sheenColor: new THREE.Color('#ffc8b8'), clippingPlanes: [sagittal], side: THREE.DoubleSide });
    const external = new THREE.MeshPhysicalMaterial({ color: '#a2322b', roughness: 0.42, clearcoat: 0.45, sheen: 0.3, sheenColor: new THREE.Color('#ff9a8a'), clippingPlanes: [sagittal], side: THREE.DoubleSide });
    const sling = external.clone();
    sling.transparent = true;
    sling.opacity = 0.35;
    sling.depthWrite = false;
    return { skin, skinGhost, boneGhost, boneFill, liver, liverFill, bladder, eso, stomach, small, colon, canal, internal, external, sling };
  }, []);
}

const CUT_FRONT = new THREE.Vector3(0, 0, 1);
const CUT_SIDE = new THREE.Vector3(1, 0, 0);

export function GutModel() {
  const m = useMaterials();
  const geo = useMemo(
    () => ({
      body: bodyGeometry(),
      bones: boneGeometry(),
      liver: liverGeometry(),
      bladder: bladderGeometry(),
      eso: esophagusGeometry(),
      stomach: stomachGeometry(),
      small: smallGeometry(),
      colon: colonGeometry(),
      appendix: appendixGeometry(),
      canal: canalGeometry(),
      sph: sphincterGeometry(),
      sling: puborectalisGeometry(),
    }),
    [],
  );
  const refs = useMemo(() => ({ internal: new THREE.Object3D(), external: new THREE.Object3D() }), []);

  useTimelineFrame((t) => {
    const x = track.skinXray(t);
    m.skin.opacity = 1 - x;
    m.skin.visible = x < 0.999;
    m.skin.depthWrite = x < 0.5;
    m.skinGhost.uniforms.uOpacity.value = x * 0.5;
    const b = track.bones(t);
    m.boneGhost.uniforms.uOpacity.value = b * 0.42;
    m.boneFill.opacity = b * 0.1;
    m.boneFill.visible = b > 0.002;
    const c = track.context(t);
    m.liver.uniforms.uOpacity.value = c * 0.5 + 0.15 * x;
    m.liverFill.opacity = c * 0.12;
    m.liverFill.visible = c > 0.002;
    m.bladder.uniforms.uOpacity.value = 0.35 * x;
    for (const o of [m.eso, m.stomach, m.small, m.colon, m.canal, m.internal, m.external, m.sling]) o.visible = x > 0.02;

    // longitudinal section: front half of every tube; the rectum/anal canal are cut sagittally
    const k = track.cut(t);
    const cutT = lerp(1.5, 0.12, k);
    for (const u of Object.values(gutU)) {
      u.uCutT.value = cutT;
      u.uCutDir.value.copy(CUT_FRONT);
      u.uTime.value = t;
    }
    gutU.colon.uCutDir2.value.copy(CUT_SIDE);
    gutU.colon.uCutBlend.value.set(COLON_S.rectum - 0.35, COLON_S.rectum + 0.1);
    gutU.canal.uCutDir.value.copy(CUT_SIDE);
    sagittal.constant = lerp(100, 0, k);
    colonRingState(t, gutU.colon.uRings.value, gutU.colon.uRingAmp.value);
    smallRingState(t, gutU.small.uRings.value, gutU.small.uRingAmp.value);
    // sphincters: relaxed = wider & thinner
    const ia = track.internal(t);
    const ea = track.external(t);
    gutU.canal.uOpen.value.set(ia, ea, track.vibration(t));
    refs.internal.scale.set(1 + 0.75 * ia, 1, 1 + 0.75 * ia);
    refs.external.scale.set(1 + 0.45 * ea, 1, 1 + 0.45 * ea);
    m.internal.color.set('#d98c80').lerp(new THREE.Color('#f0b8aa'), ia);
    m.external.color.set('#a2322b').lerp(new THREE.Color('#d0645a'), ea);
  });

  return (
    <group name="GutExplainer" scale={S}>
      <mesh name="Body" geometry={geo.body} material={m.skin} castShadow receiveShadow renderOrder={20} />
      <mesh name="BodyXRay" geometry={geo.body} material={m.skinGhost} renderOrder={21} />
      <mesh name="Bones" geometry={geo.bones} material={m.boneFill} renderOrder={6} />
      <mesh name="BonesXRay" geometry={geo.bones} material={m.boneGhost} renderOrder={19} />
      <mesh name="LiverFill" geometry={geo.liver} material={m.liverFill} renderOrder={7} />
      <mesh name="Liver" geometry={geo.liver} material={m.liver} renderOrder={18} />
      <mesh name="Bladder" geometry={geo.bladder} material={m.bladder} renderOrder={18} />
      <mesh name="Esophagus" geometry={geo.eso} material={m.eso} />
      <mesh name="Stomach" geometry={geo.stomach} material={m.stomach} />
      <mesh name="SmallIntestine" geometry={geo.small} material={m.small} />
      <mesh name="Colon" geometry={geo.colon} material={m.colon} />
      <mesh name="Appendix" geometry={geo.appendix} material={m.colon} />
      <mesh name="AnalCanal" geometry={geo.canal} material={m.canal} />
      <group position={ANAL.top} quaternion={canalQuat}>
        <primitive object={refs.internal}>
          <mesh name="InternalSphincter" geometry={geo.sph.internal} material={m.internal} />
        </primitive>
        <primitive object={refs.external}>
          <mesh name="ExternalSphincter" geometry={geo.sph.external} material={m.external} />
        </primitive>
      </group>
      <mesh name="Puborectalis" geometry={geo.sling} material={m.sling} />
    </group>
  );
}
