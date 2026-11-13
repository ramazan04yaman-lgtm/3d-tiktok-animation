import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import { getStreamTexture } from './textures';
import type { Vec3 } from '../camera';

export interface LiquidStreamProps {
  /** where the stream leaves the nozzle */
  from: Vec3;
  /** y of the surface it falls onto (may change over time, e.g. a filling cup) */
  toY: (t: number) => number;
  /** 0 = no flow, 1 = full stream */
  flow: (t: number) => number;
  radius?: number;
  color?: THREE.ColorRepresentation;
  /** texture scroll speed (dm/s) */
  speed?: number;
  seed?: number;
}

/**
 * Falling liquid jet. Thins out as it accelerates (continuity: r ∝ v^-½), the leading edge travels
 * down at the start and the tail detaches at the end. Visual model, not a fluid simulation.
 */
export function LiquidStream({ from, toY, flow, radius = 0.022, color = '#3a1d0c', speed = 6, seed = 0 }: LiquidStreamProps) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => {
    const map = getStreamTexture().clone();
    map.needsUpdate = true;
    map.repeat.set(1, 3);
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, map, transparent: true, envMapIntensity: 1.4 });
  }, [color]);
  // unit cylinder: top at y=0, bottom at y=-1, tapering
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 0.62, 1, 16, 24, false);
    g.translate(0, -0.5, 0);
    return g;
  }, []);
  const base = useMemo(() => geo.attributes.position.array.slice() as Float32Array, [geo]);

  useTimelineFrame((t) => {
    const m = ref.current;
    if (!m) return;
    const f = flow(t);
    const len = from[1] - toY(t);
    m.visible = f > 0.01 && len > 0.01;
    if (!m.visible) return;
    const r = radius * Math.sqrt(f);
    m.scale.set(r, len, r);
    mat.opacity = Math.min(1, f * 3);
    if (mat.map) mat.map.offset.y = (t * speed) / len;
    // gentle sideways wobble increasing downwards
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = base[i * 3 + 1];
      const d = -y; // 0 top … 1 bottom
      const w = d * d * 0.35;
      p.setX(i, base[i * 3] + Math.sin(t * 9 + d * 7 + seed) * w);
      p.setZ(i, base[i * 3 + 2] + Math.cos(t * 7.3 + d * 6 + seed) * w);
    }
    p.needsUpdate = true;
  });

  return <mesh ref={ref} geometry={geo} material={mat} position={from as unknown as THREE.Vector3Tuple} renderOrder={6} castShadow />;
}
