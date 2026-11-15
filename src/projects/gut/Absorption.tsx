import { useMemo } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { useTimelineFrame } from '../../engine/time';
import { lungGeometry } from '../heart/body';
import { Y0 } from './anatomy';
import { colonFrames } from './gas';
import * as track from './script';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** where the gas leaves the body through the mouth (model coordinates) */
export const MOUTH = v(0, 15.92, 0.84);
const CARINA = v(0, 13.95, -0.18);

/**
 * The surprising fact: part of the intestinal hydrogen diffuses through the gut wall into the blood
 * (mesenteric/portal veins → vena cava → heart → lungs) and is exhaled — the basis of the H₂ breath test.
 */
export function Absorption() {
  const paths = useMemo(() => {
    const out: THREE.CatmullRomCurve3[] = [];
    [1.6, 3.0, 4.4, 5.8, 7.2].forEach((s, i) => {
      const src = colonFrames.point(s, new THREE.Vector3());
      const side = i % 2 === 0 ? -1 : 1;
      out.push(
        new THREE.CatmullRomCurve3(
          [src, v(-0.15 + 0.05 * i, 11.0, 0.05), v(-0.2, 11.6, -0.05), v(-0.18, 12.4, -0.2), v(0.05, 13.0, 0.05), v(side * 0.75, 13.3, -0.1), v(side * 0.35, 13.75, -0.2), CARINA, v(0, 14.9, -0.12), v(0, 15.6, 0.25), MOUTH, v(0.0, 16.0, 1.5), v(0.0, 16.15, 2.4)],
          false,
          'centripetal',
        ),
      );
    });
    return out;
  }, []);
  const geo = useMemo(() => {
    const lungs = lungGeometry().clone();
    lungs.translate(0, Y0, 0);
    const trachea = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([CARINA, v(0, 14.9, -0.12), v(0, 15.5, 0.1), v(0, 15.75, 0.55), MOUTH]), 40, 0.075, 12);
    return { lungs, trachea };
  }, []);
  const mats = useMemo(() => {
    const lung = createXRayMaterial('#ff9fb0');
    lung.uniforms.uPower.value = 1.6;
    const airway = createXRayMaterial('#9fe8ff');
    return { lung, airway };
  }, []);
  useTimelineFrame((t) => {
    const l = track.lungs(t);
    mats.lung.uniforms.uOpacity.value = l * 0.75;
    mats.airway.uniforms.uOpacity.value = l * 0.8;
  });
  return (
    <group name="Absorption">
      <mesh geometry={geo.lungs} material={mats.lung} renderOrder={18} />
      <mesh geometry={geo.trachea} material={mats.airway} renderOrder={18} />
      {paths.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={track.absorb} count={70} travel={(t) => t * 1.6 + i * 0.7} size={0.035} stretch={1.8} color="#7fe8ff" glow={2.4} spread={0.05} />
      ))}
    </group>
  );
}
