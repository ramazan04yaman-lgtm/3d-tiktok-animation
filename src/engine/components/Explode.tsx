import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import type { Vec3 } from '../camera';

/** Moves its children by `offset * amount(t)` — building block for exploded views. */
export function Explode({ offset, amount, children }: { offset: Vec3; amount: (t: number) => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useTimelineFrame((t) => {
    const k = amount(t);
    ref.current?.position.set(offset[0] * k, offset[1] * k, offset[2] * k);
  });
  return <group ref={ref}>{children}</group>;
}
