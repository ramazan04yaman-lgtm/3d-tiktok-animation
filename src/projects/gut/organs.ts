import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { noise3 } from '../../engine/geometry/noise';
import { len3, sdEllipsoid, segDist, smax, smin, surfaceNets } from '../../engine/geometry/surfaceNets';
import { skeletonGeometry } from '../heart/body';
import { ANAL, BODY_BOUNDS, COLON, COLON_LEN, COLON_S, ESOPHAGUS, SMALL, SMALL_R, STOMACH, Y0, colonR, sdBody, sdPelvis, stomachR } from './anatomy';
import { organTube } from './tube';

const cache = new Map<string, unknown>();
const once = <T>(k: string, f: () => T): T => {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k) as T;
};

export const bodyGeometry = () => once('body', () => surfaceNets(sdBody, { ...BODY_BOUNDS, step: 0.055, project: 1 }));

/** ribs, sternum, clavicles, thoracic + upper lumbar spine (heart episode) + pelvis & legs */
export const boneGeometry = () =>
  once('bones', () => {
    const sk = skeletonGeometry(4, true);
    const upper = mergeGeometries([sk.bone, sk.cartilage]);
    upper.translate(0, Y0, 0);
    const pelvis = surfaceNets(sdPelvis, { min: [-1.35, 0.6, -1.0], max: [1.35, 10.9, 0.8], step: 0.04, project: 1 }).toNonIndexed();
    pelvis.deleteAttribute('uv');
    upper.deleteAttribute('uv');
    return mergeGeometries([upper, pelvis].map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
      return n;
    }));
  });

/** liver and bladder as faint context organs */
export const liverGeometry = () =>
  once('liver', () =>
    surfaceNets(
      (x, y, z) => {
        let d = sdEllipsoid(x, y, z, [-0.42, 12.15, 0.02], [0.95, 0.5, 0.72]);
        d = smin(d, sdEllipsoid(x, y, z, [0.22, 12.3, 0.25], [0.5, 0.26, 0.4]), 0.25);
        d = smax(d, -sdEllipsoid(x, y, z, [0.62, 11.65, 0.25], [0.55, 0.5, 0.55]), 0.15);
        d = smax(d, y - 12.62 - 0.1 * x, 0.2);
        return d + 0.01 * noise3(x * 4, y * 4, z * 4);
      },
      { min: [-1.5, 11.2, -0.8], max: [1.0, 12.9, 0.9], step: 0.04, project: 1 },
    ),
  );
export const bladderGeometry = () => once('bladder', () => surfaceNets((x, y, z) => sdEllipsoid(x, y, z, [0, 8.92, 0.32], [0.32, 0.26, 0.26]), { min: [-0.4, 8.6, 0.0], max: [0.4, 9.25, 0.65], step: 0.03, project: 1 }));

export const esophagusGeometry = () => once('eso', () => organTube(ESOPHAGUS, { radius: () => 0.075, density: 30, radial: 18, color: '#c98a7d' }));
export const stomachGeometry = () => once('stomach', () => organTube(STOMACH, { radius: (_s, u) => stomachR(u), density: 60, radial: 36, capStart: true, color: '#d9978a' }));
export const smallGeometry = () => once('small', () => organTube(SMALL, { radius: () => SMALL_R, density: 36, radial: 20, ripple: 0.025, capStart: false, color: '#e3a48f' }));
export const colonGeometry = () =>
  once('colon', () =>
    organTube(COLON, {
      radius: (s) => colonR(s),
      density: 60,
      radial: 36,
      haustra: { spacing: 0.32, depth: 0.12, from: 0.1, to: COLON_S.rectum - 0.25 },
      capStart: true,
      color: '#d5a089',
      bandColor: '#ecd4bb',
    }),
  );
/** appendix hanging from the caecum */
export const appendixGeometry = () =>
  once('appendix', () => organTube(new THREE.CatmullRomCurve3([[-0.78, 8.98, 0.22], [-0.68, 8.78, 0.25], [-0.56, 8.72, 0.32], [-0.5, 8.8, 0.38]].map((p) => new THREE.Vector3(...p))), { radius: () => 0.035, density: 50, radial: 12, capStart: false, capEnd: true, color: '#d5a089' }));

/** anal canal (straight, from the anorectal junction to the anus); opened by uOpen in the shader */
export const canalGeometry = () =>
  once('canal', () => {
    const a = ANAL.top.clone().addScaledVector(ANAL.dir, -0.05);
    const b = ANAL.top.clone().addScaledVector(ANAL.dir, ANAL.len);
    return organTube(new THREE.LineCurve3(a, b), { radius: (s) => 0.016 + 0.05 * Math.exp(-((s / 0.06) ** 2)) + 0.01 * Math.max(0, (s - 0.36) / 0.09), density: 120, radial: 32, color: '#c98276' });
  });

/** sphincter rings: lathe of an elliptical cross-section around the canal axis (local +y = canal direction) */
function ring(rc: number, sc: number, ar: number, as: number) {
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    prof.push(new THREE.Vector2(rc + ar * Math.cos(a), sc + as * Math.sin(a)));
  }
  const g = new THREE.LatheGeometry(prof, 48);
  g.computeVertexNormals();
  return g;
}
export const sphincterGeometry = () =>
  once('sph', () => ({
    internal: ring(0.048, 0.15, 0.017, 0.11),
    external: ring(0.088, 0.29, 0.03, 0.12),
  }));
export const puborectalisGeometry = () =>
  once('pr', () => {
    const c = new THREE.CatmullRomCurve3([[0.12, 8.98, 0.52], [0.2, 8.62, 0.1], [0.14, 8.36, -0.32], [0.0, 8.26, -0.44], [-0.14, 8.36, -0.32], [-0.2, 8.62, 0.1], [-0.12, 8.98, 0.52]].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    return new THREE.TubeGeometry(c, 64, 0.028, 10);
  });

/** canal frame: rotation that maps local +y onto the canal direction */
export const canalQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ANAL.dir);

export { COLON_LEN, len3, segDist };
