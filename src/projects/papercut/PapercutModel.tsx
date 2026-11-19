import { useMemo } from 'react';
import * as THREE from 'three';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { EDGE, createSkinMaterial, fingerGeometry, nailGeometry, type FingerUniforms } from './finger';
import * as track from './script';

/** sheet frame: edge along x, sheet extends along D (away from the finger, tilted down), normal N */
export const SX = new THREE.Vector3(1, 0, 0);
export const SD = new THREE.Vector3(0, -0.5, 1).normalize();
export const SN = new THREE.Vector3().crossVectors(SX, SD).normalize();
export const sheetQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(SX, SD, SN));

export const fingerU: FingerUniforms = { uCut: { value: 0 }, uOpen: { value: 0 }, uPress: { value: 0 }, uEdgeX: { value: 0 }, uLine: { value: 0 } };

let _paperTex: THREE.CanvasTexture | null = null;
/** procedural paper: off-white, faint fibre streaks and grain */
export function paperTexture() {
  if (_paperTex) return _paperTex;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3f1ea';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = hash2(i, 1) * 512;
    const y = hash2(i, 2) * 512;
    const a = hash2(i, 3) * Math.PI;
    const l = 6 + hash2(i, 4) * 26;
    g.strokeStyle = `rgba(${170 + hash2(i, 5) * 40},${165 + hash2(i, 6) * 40},${150 + hash2(i, 7) * 40},${0.08 + hash2(i, 8) * 0.12})`;
    g.lineWidth = 0.6 + hash2(i, 9);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  _paperTex = new THREE.CanvasTexture(c);
  _paperTex.wrapS = _paperTex.wrapT = THREE.RepeatWrapping;
  _paperTex.repeat.set(3, 3);
  _paperTex.colorSpace = THREE.SRGBColorSpace;
  return _paperTex;
}

export function PapercutModel() {
  const geo = useMemo(() => ({ finger: fingerGeometry(), nail: nailGeometry() }), []);
  const mats = useMemo(() => {
    const skin = createSkinMaterial(fingerU);
    const nail = new THREE.MeshPhysicalMaterial({ color: '#f0c9bd', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true });
    const paper = new THREE.MeshPhysicalMaterial({ map: paperTexture(), color: '#b9b4aa', roughness: 0.9, sheen: 0.3, sheenColor: new THREE.Color('#ffffff'), transparent: true });
    return { skin, nail, paper };
  }, []);
  const sheet = useMemo(() => new THREE.Object3D(), []);

  useTimelineFrame((t) => {
    const f = track.fingerVis(t);
    for (const m of [mats.skin, mats.nail]) {
      m.opacity = f;
      m.visible = f > 0.002;
      m.depthWrite = f > 0.5;
    }
    mats.paper.opacity = f;
    mats.paper.visible = f > 0.002;
    mats.paper.depthWrite = f > 0.5;
    const press = track.press(t);
    fingerU.uCut.value = track.cut(t);
    fingerU.uOpen.value = track.open(t);
    fingerU.uPress.value = press;
    fingerU.uEdgeX.value = track.sheetX(t);
    fingerU.uLine.value = track.line(t);
    sheet.position.copy(EDGE).addScaledVector(SX, track.sheetX(t)).addScaledVector(SD, track.retract(t) - 0.02).addScaledVector(new THREE.Vector3(0, 0, -1), press * 0.065);
  });

  return (
    <group name="Papercut">
      <mesh name="Finger" geometry={geo.finger} material={mats.skin} castShadow receiveShadow />
      <mesh name="Nail" geometry={geo.nail} material={mats.nail} />
      <primitive object={sheet} quaternion={sheetQuat}>
        <mesh name="Paper" material={mats.paper} position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.5, 4, 0.012]} />
        </mesh>
      </primitive>
    </group>
  );
}
