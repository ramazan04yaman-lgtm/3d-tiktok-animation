import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { noise3 } from '../../engine/geometry/noise';
import { sdEllipsoid, sdTube, smax, smin, surfaceNets } from '../../engine/geometry/surfaceNets';
import { useTimelineFrame } from '../../engine/time';
import { BRAIN_C, BULB } from './script';
import * as track from './script';

const [CX, CY, CZ] = BRAIN_C;

/** isotropic folding field: two rotated, domain-warped value noises (no grid-aligned "puzzle" look) */
function foldField(x: number, y: number, z: number) {
  const k = 3.4;
  const w = 0.6 * noise3(x * 1.1 + 7, y * 1.1, z * 1.1);
  const ax = 0.8 * x + 0.36 * y - 0.48 * z, ay = -0.36 * x + 0.93 * y + 0.06 * z, az = 0.48 * x + 0.06 * y + 0.87 * z;
  const bx = 0.6 * x - 0.64 * y + 0.48 * z, by = 0.64 * x + 0.75 * y + 0.16 * z, bz = -0.48 * x + 0.16 * y + 0.86 * z;
  return 0.6 * noise3(ax * k + w, ay * k * 1.1 - w, az * k + 3) + 0.4 * noise3(bx * k * 1.3 - w, by * k * 1.3 + 5, bz * k * 1.3 + w);
}
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** sulcus depth (0 crown … 1 groove bottom) */
function groove(x: number, y: number, z: number) {
  const f = Math.abs(foldField(x, y, z));
  return 1 - sstep(0, 0.26, f);
}
/** rounded gyri: crowns bulge out away from the grooves */
function relief(x: number, y: number, z: number) {
  const f = Math.abs(foldField(x, y, z));
  return 0.038 * (1 - sstep(0, 0.26, f)) - 0.026 * sstep(0.12, 0.5, f);
}
function cerebellumGroove(x: number, y: number) {
  return Math.pow(Math.abs(Math.sin((y + 0.25 * x) * 34)), 6);
}

/** cerebrum (two hemispheres + temporal lobes), cerebellum and brainstem */
function sdBrain(x: number, y: number, z: number) {
  const px = x - CX, py = y - CY, pz = z - CZ;
  const az = Math.abs(pz);
  // hemisphere with a flatter base, separated by the longitudinal fissure
  let h = sdEllipsoid(px, py, az, [0.05, 0.05, 0.86], [2.0, 1.35, 0.92]);
  h = smin(h, sdEllipsoid(px, py, az, [0.45, -0.62, 1.05], [1.15, 0.6, 0.55]), 0.25);
  h = smax(h, -(py + 1.05), 0.2);
  h = smax(h, 0.04 - az, 0.06);
  h += relief(px, py, pz);
  // lateral sulcus (between frontal and temporal lobe)
  h += 0.07 * Math.max(0, 1 - Math.abs(py + 0.38 - 0.25 * (px - 0.2)) / 0.06) * (px > -0.6 && px < 1.6 && az > 0.6 ? 1 : 0);
  // cerebellum (back, below)
  let c = sdEllipsoid(px, py, az, [-1.35, -0.95, 0.42], [0.75, 0.48, 0.62]);
  c += 0.02 * cerebellumGroove(px, py);
  // brainstem
  const s = sdTube(px, py, pz, [[-0.35, -0.6, 0], [-0.5, -1.4, 0], [-0.6, -2.3, 0]], 0.3, 0.22);
  return smin(smin(h, c, 0.08), s, 0.15);
}

const cache: { geo?: THREE.BufferGeometry } = {};
export function brainGeometry() {
  if (!cache.geo) {
    cache.geo = surfaceNets(sdBrain, {
      min: [CX - 2.3, CY - 2.5, CZ - 1.95],
      max: [CX + 2.3, CY + 1.55, CZ + 1.95],
      step: 0.028,
      project: 1,
      attributes: {
        sizes: { color: 3 },
        fill: (p, _n, out) => {
          const g = groove(p.x - CX, p.y - CY, p.z - CZ);
          const k = 1 - 0.55 * g;
          out.color = [0.78 * k, 0.4 * k * k, 0.42 * k * k];
        },
      },
    });
  }
  return cache.geo;
}

export function Brain() {
  const geo = useMemo(() => brainGeometry(), []);
  const mats = useMemo(() => {
    const tissue = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color('#ffd0d0'), transparent: true });
    const xray = createXRayMaterial('#ff9ab8');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#fff3dc', roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false, emissive: new THREE.Color('#ffb860'), emissiveIntensity: 0.6 });
    const filament = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf7a').multiplyScalar(4), toneMapped: false, transparent: true });
    const base = new THREE.MeshPhysicalMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.3, transparent: true });
    const skull = createXRayMaterial('#f3ead8');
    return { tissue, xray, glass, filament, base, skull };
  }, []);
  const bulbG = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const brainMesh = useRef<THREE.Mesh>(null);
  const skullMesh = useRef<THREE.Mesh>(null);
  const bulbGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI;
      const r = 0.55 * Math.sin(a);
      const y = 0.75 - 0.55 * Math.cos(a);
      pts.push(new THREE.Vector2(i < 28 ? r : Math.max(0.2, r * (1 - (i - 28) / 30)), y));
    }
    pts.push(new THREE.Vector2(0.2, 0));
    const glass = new THREE.LatheGeometry(pts.reverse(), 48);
    const helix: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) helix.push(new THREE.Vector3(-0.18 + (0.36 * i) / 120, 0.78 + 0.03 * Math.sin(i * 0.9), 0.03 * Math.cos(i * 0.9)));
    const fil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 200, 0.014, 6, false);
    return { glass, fil };
  }, []);
  useTimelineFrame((t) => {
    const x = track.brainXray(t);
    mats.tissue.opacity = 1 - x;
    mats.tissue.depthWrite = x < 0.5;
    if (brainMesh.current) brainMesh.current.visible = x < 0.995;
    mats.xray.uniforms.uOpacity.value = 0.6 * x;
    const b = track.bulb(t);
    if (bulbG.current) bulbG.current.visible = b > 0.002;
    mats.glass.opacity = 0.35 * b;
    mats.filament.opacity = b;
    mats.base.opacity = b;
    if (light.current) light.current.intensity = 6 * b * (0.95 + 0.05 * Math.sin(t * 40));
    const s = track.skull(t);
    if (skullMesh.current) skullMesh.current.visible = s > 0.002;
    mats.skull.uniforms.uOpacity.value = 0.55 * s;
  });
  return (
    <group name="Brain">
      <mesh ref={brainMesh} geometry={geo} material={mats.tissue} castShadow receiveShadow />
      <mesh geometry={geo} material={mats.xray} renderOrder={20} />
      {/* skull (reveal) */}
      <mesh ref={skullMesh} material={mats.skull} position={[CX - 0.05, CY - 0.25, CZ]} scale={[2.55, 2.05, 2.15]} renderOrder={21}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
      {/* light bulb for the hook */}
      <group ref={bulbG} position={BULB}>
        <mesh geometry={bulbGeo.glass} material={mats.glass} renderOrder={22} />
        <mesh geometry={bulbGeo.fil} material={mats.filament} />
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} material={mats.base} position={[x * 1.4, 0.45, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.6, 6]} />
          </mesh>
        ))}
        <mesh material={mats.base} position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.21, 0.18, 0.36, 32]} />
        </mesh>
        {[-0.3, -0.22, -0.14, -0.06].map((y) => (
          <mesh key={y} material={mats.base} position={[0, y, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.205, 0.012, 8, 32]} />
          </mesh>
        ))}
        <pointLight ref={light} position={[0, 0.8, 0]} color="#ffc27a" distance={6} decay={2} />
      </group>
    </group>
  );
}
