import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createXRayMaterial } from '../../engine/components/cutaway';
import { hash2, wobble } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import * as track from './script';

const COUNT = 34;
const BOND = 0.05;
const HALF = (104.5 / 2) * (Math.PI / 180);

/**
 * Magnified water molecules (dipoles) in the alternating field — physically honest version:
 * - each molecule only PARTLY turns towards the field (hydrogen bonds hold it back),
 * - it lags behind the field reversal (phase lag → dielectric loss),
 * - thermal jiggling/collisions grow as energy is absorbed.
 * No free "propeller" rotation. The field reversal is shown ~4·10⁹ × slower than reality.
 */
export function Molecules({ center, radius = 0.42 }: { center: [number, number, number]; radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const shell = createXRayMaterial('#8fd0ff', []);
    const o = new THREE.MeshPhysicalMaterial({ color: '#e5484d', roughness: 0.25, clearcoat: 1, emissive: '#ff6a2a', emissiveIntensity: 0 });
    const h = new THREE.MeshPhysicalMaterial({ color: '#f2f4f7', roughness: 0.25, clearcoat: 1 });
    const bond = new THREE.MeshStandardMaterial({ color: '#cfd6de', roughness: 0.4 });
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#5ab8ff', toneMapped: false, transparent: true });
    const back = new THREE.MeshPhysicalMaterial({ color: '#0b1520', roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.BackSide });
    return { shell, o, h, bond, arrowMat, back };
  }, []);
  const mol = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        // random point in sphere
        let p: THREE.Vector3;
        let k = 0;
        do {
          p = new THREE.Vector3(hash2(i, k) * 2 - 1, hash2(i, k + 50) * 2 - 1, hash2(i, k + 100) * 2 - 1);
          k++;
        } while (p.lengthSq() > 1);
        const base = new THREE.Vector3(hash2(i, 7) * 2 - 1, hash2(i, 8) * 2 - 1, hash2(i, 9) * 2 - 1).normalize();
        const perp = new THREE.Vector3(hash2(i, 10) - 0.5, hash2(i, 11) - 0.5, hash2(i, 12) - 0.5).cross(base).normalize();
        return { p: p.multiplyScalar(radius * 0.72), base, perp, seed: i * 1.37 };
      }),
    [radius],
  );
  const refs = useRef<THREE.Group[]>([]);
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), n: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3() }), []);

  useTimelineFrame((t) => {
    const v = track.molecules(t);
    if (group.current) group.current.visible = v > 0.002;
    if (v <= 0.002) return;
    group.current!.scale.setScalar(0.6 + 0.4 * v);
    mats.shell.uniforms.uOpacity.value = v;
    mats.back.opacity = 0.55 * v;
    const lag = 0.32; // s — molecules follow the field with a delay
    const Ef = track.fieldPhase(t - lag);
    const align = 0.85; // partial alignment only
    const heat = Math.min(1, (track.foodTemp(t) - 20) / 50);
    const agit = 0.25 + 0.75 * heat + 0.35 * Math.max(0, (t - track.T.molecules[0]) / 9);
    mats.o.emissiveIntensity = 0.15 + agit * 0.6;
    mol.forEach((mo, i) => {
      const g = refs.current[i];
      if (!g) return;
      const { d, n } = tmp;
      d.copy(mo.base)
        .addScaledVector(new THREE.Vector3(1, 0, 0), align * Ef)
        .add(new THREE.Vector3(wobble(t * 3.1, mo.seed) * 0.5 * agit, wobble(t * 2.7, mo.seed + 5) * 0.5 * agit, wobble(t * 2.9, mo.seed + 9) * 0.5 * agit))
        .normalize();
      n.copy(mo.perp).sub(d.clone().multiplyScalar(mo.perp.dot(d))).normalize();
      // orthonormal basis: x = dipole direction, y = in-plane perpendicular
      tmp.z.crossVectors(d, n).normalize();
      tmp.m.makeBasis(d, n, tmp.z);
      g.quaternion.setFromRotationMatrix(tmp.m);
      const j = 0.018 * agit;
      g.position.set(mo.p.x + wobble(t * 4.3, mo.seed + 2) * j, mo.p.y + wobble(t * 3.9, mo.seed + 4) * j, mo.p.z + wobble(t * 4.1, mo.seed + 6) * j);
    });
    if (arrow.current) arrow.current.scale.x = Math.sign(track.fieldPhase(t)) * Math.max(0.15, Math.abs(track.fieldPhase(t)));
    mats.arrowMat.opacity = v;
  });

  const hx = Math.cos(HALF) * BOND;
  const hy = Math.sin(HALF) * BOND;
  return (
    <group ref={group} position={center} visible={false}>
      <mesh material={mats.back} renderOrder={1}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
      <mesh material={mats.shell} renderOrder={18}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
      {mol.map((_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el!)}>
          <mesh material={mats.o}>
            <sphereGeometry args={[0.028, 20, 14]} />
          </mesh>
          {/* hydrogens on the positive side of the dipole (+x local) */}
          <mesh material={mats.h} position={[hx, hy, 0]}>
            <sphereGeometry args={[0.017, 16, 12]} />
          </mesh>
          <mesh material={mats.h} position={[hx, -hy, 0]}>
            <sphereGeometry args={[0.017, 16, 12]} />
          </mesh>
        </group>
      ))}
      {/* field direction indicator below the sphere */}
      <group position={[0, -radius - 0.08, 0]}>
        <group ref={arrow}>
          <mesh material={mats.arrowMat} rotation-z={-Math.PI / 2} position-x={0.12}>
            <coneGeometry args={[0.035, 0.08, 20]} />
          </mesh>
          <mesh material={mats.arrowMat} rotation-z={Math.PI / 2} position-x={-0.03}>
            <cylinderGeometry args={[0.011, 0.011, 0.26, 12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
