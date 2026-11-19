import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { EDGE } from './finger';
import { sheetQuat } from './PapercutModel';
import * as track from './script';

/**
 * The paper edge under the microscope: a mat of cellulose fibres (Ø ≈ 20–40 µm, strongly magnified),
 * fibre ends and loops sticking out of the cut edge like the teeth of a saw.
 * Local frame = sheet frame: x along the edge, y into the sheet, z = sheet normal.
 */
export function Micro() {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const T = 0.05; // half thickness of the sheet at this magnification
    const N = 260;
    for (let i = 0; i < N; i++) {
      const ang = (hash2(i, 1) - 0.5) * Math.PI;
      const len = 0.18 + 0.32 * hash2(i, 2);
      const cx = (hash2(i, 3) - 0.5) * 1.1;
      // fibres near the edge: many cross it and protrude (the "teeth")
      const cy = -0.04 + Math.pow(hash2(i, 4), 1.6) * 0.6;
      const cz = (hash2(i, 5) - 0.5) * 2 * T * 0.85;
      const dx = Math.cos(ang) * len * 0.5;
      const dy = Math.sin(ang) * len * 0.5;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 4; k++) {
        const u = k / 4 - 0.5;
        let y = cy + dy * u * 2;
        // the cut sheet ends at y = 0: protruding fibre ends are short (≤ 0.07)
        if (y < -0.07) y = -0.07 + (y + 0.07) * 0.15;
        pts.push(new THREE.Vector3(cx + dx * u * 2, y, cz + 0.012 * Math.sin(u * 6 + i) + (hash2(i, 6) - 0.5) * 0.01));
      }
      const r = 0.0055 + 0.0055 * hash2(i, 7);
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 6);
      g.deleteAttribute('uv');
      parts.push(g.toNonIndexed());
    }
    const fibres = mergeGeometries(parts);
    // fines & filler particles (calcium carbonate / clay)
    return { fibres };
  }, []);
  const mats = useMemo(() => {
    const fibre = new THREE.MeshPhysicalMaterial({ color: '#cfc8b8', roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.3, transparent: true });
    const body = new THREE.MeshPhysicalMaterial({ color: '#e9e3d4', roughness: 0.7, transparent: true, opacity: 0.0, depthWrite: false });
    return { fibre, body };
  }, []);
  useTimelineFrame((t) => {
    const v = track.micro(t);
    if (group.current) group.current.visible = v > 0.002;
    mats.fibre.opacity = v;
    mats.fibre.depthWrite = v > 0.5;
    mats.body.opacity = v * 0.55;
  });
  return (
    <group ref={group} position={EDGE} quaternion={sheetQuat} name="PaperMicroscope">
      <mesh geometry={geo.fibres} material={mats.fibre} castShadow />
      <mesh material={mats.body} position={[0, 0.33, 0]}>
        <boxGeometry args={[1.1, 0.62, 0.075]} />
      </mesh>
    </group>
  );
}
