import { useMemo } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../../engine/time';
import { AV_PLANE, BEAT, LV, PAPILLARY, RV, VALVES, atrium, avOpen, slOpen, ventricle } from './anatomy';

type P = readonly number[];
const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** TS twin of heartDisplace() for points on the inner surface of the ventricles (papillary tips) */
export function displaceInner(p: P, uV: number, out = new THREE.Vector3()) {
  const base = p[1] < AV_PLANE ? smooth(-0.66, AV_PLANE, p[1]) : 1 - smooth(AV_PLANE, 0.8, p[1]);
  const lat = 1 - smooth(0.5, 0.85, Math.abs(p[0]));
  out.set(p[0], p[1] - BEAT.longShort * uV * base * lat, p[2]);
  const ax = p[0] > -0.03 ? [LV.c[0], LV.c[2]] : [RV.c[0], RV.c[2]];
  const k = BEAT.inner * uV * smooth(-0.68, -0.3, p[1]);
  out.x += (ax[0] - out.x) * k;
  out.z += (ax[1] - out.z) * k;
  return out;
}

interface LeafletSpec {
  /** angular range of the hinge on the annulus */
  a0: number;
  a1: number;
}

const NU = 18;
const NV = 8;

function makeGrid(leaflets: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(leaflets * NU * NV * 3), 3));
  const idx: number[] = [];
  for (let l = 0; l < leaflets; l++) {
    const o = l * NU * NV;
    for (let i = 0; i < NU - 1; i++)
      for (let j = 0; j < NV - 1; j++) {
        const a = o + i * NV + j,
          b = a + NV;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  g.setIndex(idx);
  return g;
}

/** Atrioventricular valve (mitral = 2 leaflets, tricuspid = 3). Hangs into the ventricle when open. */
function avShape(pos: THREE.BufferAttribute, c: P, R: number, specs: LeafletSpec[], open: number, shift: number, freeEdge: THREE.Vector3[]) {
  let k = 0;
  freeEdge.length = 0;
  specs.forEach((s) => {
    const mid = (s.a0 + s.a1) / 2;
    // coaptation line through the centre, perpendicular to the leaflet's bisector
    const tx = -Math.sin(mid),
      tz = Math.cos(mid);
    for (let i = 0; i < NU; i++) {
      const u = i / (NU - 1);
      const th = s.a0 + (s.a1 - s.a0) * u;
      const ax = c[0] + R * Math.cos(th),
        ay = c[1] + 0.012 * Math.cos(2 * th) + shift,
        az = c[2] + R * Math.sin(th);
      const proj = (ax - c[0]) * tx + (az - c[2]) * tz;
      const Tx = c[0] + tx * proj * 0.96,
        Tz = c[2] + tz * proj * 0.96;
      const Ty = c[1] - 0.035 + shift;
      // open: hanging down along the ventricular wall, slightly inwards
      const L = R * 1.15;
      const dx = -0.22 * Math.cos(th),
        dz = -0.22 * Math.sin(th),
        dy = -1;
      const dl = Math.hypot(dx, dy, dz);
      for (let j = 0; j < NV; j++) {
        const sv = j / (NV - 1);
        const edgeFade = Math.pow(Math.sin(Math.PI * u), 0.5);
        // closed: towards the coaptation line, bellying up towards the atrium
        const cx = ax + (Tx - ax) * sv * edgeFade,
          cy = ay + (Ty - ay) * sv * edgeFade + 0.03 * Math.sin(Math.PI * sv) * edgeFade,
          cz = az + (Tz - az) * sv * edgeFade;
        const ox = ax + (dx / dl) * L * sv,
          oy = ay + (dy / dl) * L * sv,
          oz = az + (dz / dl) * L * sv;
        pos.setXYZ(k++, cx + (ox - cx) * open, cy + (oy - cy) * open, cz + (oz - cz) * open);
        if (j === NV - 1 && i % 4 === 2) freeEdge.push(new THREE.Vector3(cx + (ox - cx) * open, cy + (oy - cy) * open, cz + (oz - cz) * open));
      }
    }
  });
}

/** Semilunar valve (aortic / pulmonary): three pocket-shaped cusps. */
function slShape(pos: THREE.BufferAttribute, c: P, R: number, axis: P, open: number, shift: number) {
  const d = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
  const U = new THREE.Vector3(1, 0, 0).sub(d.clone().multiplyScalar(d.x)).normalize();
  const W = new THREE.Vector3().crossVectors(d, U);
  let k = 0;
  for (let cusp = 0; cusp < 3; cusp++) {
    for (let i = 0; i < NU; i++) {
      const u = i / (NU - 1);
      const th = (cusp / 3) * Math.PI * 2 + (u - 0.5) * ((Math.PI * 2) / 3);
      const su = Math.sin(Math.PI * u);
      const A = new THREE.Vector3(c[0], c[1] + shift, c[2])
        .addScaledVector(U, R * Math.cos(th))
        .addScaledVector(W, R * Math.sin(th))
        .addScaledVector(d, -0.035 * su);
      for (let j = 0; j < NV; j++) {
        const sv = j / (NV - 1);
        const inward = sv * Math.pow(su, 0.35);
        const closed = A.clone()
          .lerp(new THREE.Vector3(c[0], c[1] + shift, c[2]).addScaledVector(d, 0.025), inward)
          .addScaledVector(d, -0.03 * Math.sin(Math.PI * sv) * su);
        const opened = A.clone().addScaledVector(d, 0.14 * sv).lerp(new THREE.Vector3(c[0], c[1] + shift, c[2]).addScaledVector(d, 0.14 * sv), 0.12 * sv * su);
        closed.lerp(opened, open);
        pos.setXYZ(k++, closed.x, closed.y, closed.z);
      }
    }
  }
}

const MITRAL: LeafletSpec[] = [
  { a0: Math.PI - 1.35, a1: Math.PI + 1.35 }, // anterior leaflet (towards septum / aorta)
  { a0: -1.79, a1: 1.79 }, // posterior leaflet
];
const TRICUSPID: LeafletSpec[] = [
  { a0: -1.05, a1: 1.05 }, // septal
  { a0: 1.05, a1: 3.14 }, // anterior
  { a0: 3.14, a1: 5.23 }, // posterior
];

export function Valves({ keep }: { keep: THREE.Plane[] }) {
  const mats = useMemo(() => {
    const leaflet = new THREE.MeshPhysicalMaterial({ color: '#cf9f8c', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#ffd2c2'), side: THREE.DoubleSide, clippingPlanes: keep, transparent: true, opacity: 0.86 });
    const free = leaflet.clone();
    free.clippingPlanes = [];
    const chord = new THREE.LineBasicMaterial({ color: '#e9cfc0', transparent: true, opacity: 0.7, clippingPlanes: keep });
    return { leaflet, free, chord };
  }, [keep]);
  const geo = useMemo(
    () => ({
      mitral: makeGrid(2),
      tricuspid: makeGrid(3),
      aortic: makeGrid(3),
      pulmonary: makeGrid(3),
      chords: (() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 2 * 3), 3));
        return g;
      })(),
    }),
    [],
  );
  const tmp = useMemo(() => ({ edge: [] as THREE.Vector3[], p: new THREE.Vector3() }), []);

  useTimelineFrame((t) => {
    const uV = ventricle(t);
    const shift = -BEAT.longShort * uV;
    const ao = avOpen(t) * (1 - 0.15 * atrium(t));
    const so = slOpen(t);
    const chords = geo.chords.attributes.position as THREE.BufferAttribute;
    let ci = 0;
    const addChords = (tips: P[]) => {
      tmp.edge.forEach((e, i) => {
        const tip = displaceInner(tips[i % tips.length], uV, tmp.p);
        chords.setXYZ(ci++, e.x, e.y, e.z);
        chords.setXYZ(ci++, tip.x, tip.y, tip.z);
      });
    };
    avShape(geo.mitral.attributes.position as THREE.BufferAttribute, VALVES.mitral.c, VALVES.mitral.r, MITRAL, ao, shift, tmp.edge);
    addChords([PAPILLARY.lvAnt.b, PAPILLARY.lvPost.b]);
    avShape(geo.tricuspid.attributes.position as THREE.BufferAttribute, VALVES.tricuspid.c, VALVES.tricuspid.r, TRICUSPID, ao, shift, tmp.edge);
    addChords([PAPILLARY.rv.b]);
    while (ci < 128) chords.setXYZ(ci++, 0, 0, 0);
    slShape(geo.aortic.attributes.position as THREE.BufferAttribute, VALVES.aortic.c, VALVES.aortic.r, VALVES.aortic.axis, so, shift * 0.6);
    slShape(geo.pulmonary.attributes.position as THREE.BufferAttribute, VALVES.pulmonary.c, VALVES.pulmonary.r, VALVES.pulmonary.axis, so, shift * 0.5);
    for (const g of [geo.mitral, geo.tricuspid, geo.aortic, geo.pulmonary]) {
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    }
    chords.needsUpdate = true;
  });

  return (
    <group name="Valves">
      <mesh name="MitralValve" geometry={geo.mitral} material={mats.leaflet} renderOrder={3} />
      <mesh name="TricuspidValve" geometry={geo.tricuspid} material={mats.leaflet} renderOrder={3} />
      <mesh name="AorticValve" geometry={geo.aortic} material={mats.leaflet} renderOrder={3} />
      <mesh name="PulmonaryValve" geometry={geo.pulmonary} material={mats.free} renderOrder={3} />
      <lineSegments name="Chordae" geometry={geo.chords} material={mats.chord} frustumCulled={false} />
    </group>
  );
}
