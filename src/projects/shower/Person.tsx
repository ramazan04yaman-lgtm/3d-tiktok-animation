import { useMemo } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { Steam } from '../../engine/effects/Steam';
import { useTimelineFrame } from '../../engine/time';
import { S, Y0 } from '../gut/anatomy';
import { bodyGeometry } from '../gut/organs';
import { lungGeometry } from '../heart/body';
import { HEAD } from './head';
import * as track from './script';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const CARINA = v(0, 13.95, -0.18);
const NOSE = v(0, 16.22, 1.0);

/**
 * The person under the shower (x-ray figure from the gut episode, model units = dm, drawn at scale S):
 * aerosol droplets (1–5 µm can reach the alveoli) are inhaled through nose/mouth into the lungs.
 */
export function Person() {
  const geo = useMemo(() => {
    const lungs = lungGeometry().clone();
    lungs.translate(0, Y0, 0);
    const trachea = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([CARINA, v(0, 14.9, -0.12), v(0, 15.5, 0.1), v(0, 15.85, 0.55), NOSE]), 40, 0.075, 12);
    const paths: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const k = i / 6;
      paths.push(
        new THREE.CatmullRomCurve3(
          [v((k - 0.5) * 1.6, 16.9 + 0.4 * Math.sin(i * 2), 2.6 + 0.4 * Math.cos(i)), v(0.1 * side, 16.4, 1.6), NOSE, v(0, 15.85, 0.55), v(0, 15.2, 0.0), CARINA, v(side * 0.35, 13.75, -0.2), v(side * 0.7, 13.3, -0.1), v(side * (0.75 + 0.1 * k), 12.6 - 0.4 * k, -0.05)],
          false,
          'centripetal',
        ),
      );
    }
    return { body: bodyGeometry(), lungs, trachea, paths };
  }, []);
  const mats = useMemo(() => {
    const body = createXRayMaterial('#7fc4ff');
    body.uniforms.uBase.value = 0.035;
    const lung = createXRayMaterial('#ff9fb0');
    lung.uniforms.uPower.value = 1.6;
    const fill = new THREE.MeshPhysicalMaterial({ color: '#d9828c', roughness: 0.7, transparent: true, opacity: 0, depthWrite: false });
    const airway = createXRayMaterial('#9fe8ff');
    return { body, lung, fill, airway };
  }, []);
  useTimelineFrame((t) => {
    const p = track.person(t);
    mats.body.uniforms.uOpacity.value = p * 0.6;
    mats.lung.uniforms.uOpacity.value = p * 0.8;
    mats.fill.opacity = p * 0.18;
    mats.airway.uniforms.uOpacity.value = p * 0.8;
  });
  const local = (q: THREE.Vector3): [number, number, number] => [q.x / S, q.y / S, q.z / S];
  return (
    <>
      <group name="Person" scale={S}>
        <mesh geometry={geo.body} material={mats.body} renderOrder={21} />
        <mesh geometry={geo.lungs} material={mats.fill} renderOrder={6} />
        <mesh geometry={geo.lungs} material={mats.lung} renderOrder={18} />
        <mesh geometry={geo.trachea} material={mats.airway} renderOrder={18} />
        {geo.paths.map((c, i) => (
          <FlowParticles key={i} curve={c} intensity={track.inhale} count={60} travel={(t) => t * 2.2 + i * 0.9} size={0.03} stretch={1.6} color="#c9f27a" glow={2.0} spread={0.06} />
        ))}
        {/* warm mist (aerosol) between the shower head and the face */}
        <Steam origin={local(new THREE.Vector3(HEAD.x, HEAD.y - 1.2, HEAD.z + 0.1))} intensity={track.mist} count={180} lifetime={3.4} riseSpeed={0.5} spread={2.6} size={1.6} opacity={0.06} />
      </group>
    </>
  );
}
