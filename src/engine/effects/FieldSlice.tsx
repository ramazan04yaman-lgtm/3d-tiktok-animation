import { useMemo } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';

export interface FieldSliceProps {
  /** world-space rectangle in the XZ plane at height y */
  min: [number, number];
  max: [number, number];
  y: number;
  /** GLSL expression for the normalised intensity |E|² at (x, z) — world coordinates */
  pattern: string;
  intensity: (t: number) => number;
  /** visual oscillation frequency (Hz) — the real field alternates billions of times per second */
  oscillation?: number;
  color?: THREE.ColorRepresentation;
}

/**
 * Horizontal slice through a standing-wave field (hot/cold spots). The pattern itself is fixed in
 * space; only its amplitude oscillates. Additive, subtle blue — matches the series' x-ray palette.
 */
export function FieldSlice({ min, max, y, pattern, intensity, oscillation = 0.6, color = '#5ab8ff' }: FieldSliceProps) {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.PlaneGeometry(max[0] - min[0], max[1] - min[1], 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate((min[0] + max[0]) / 2, y, (min[1] + max[1]) / 2);
    const m = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uOsc: { value: 1 }, uColor: { value: new THREE.Color(color) }, uMin: { value: new THREE.Vector2(...min) }, uMax: { value: new THREE.Vector2(...max) } },
      vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform float uI, uOsc; uniform vec3 uColor; uniform vec2 uMin, uMax; varying vec3 vW;
        float fieldAt(float x, float z) { return ${pattern}; }
        void main() {
          float e = fieldAt(vW.x, vW.z);
          vec2 d = min(vW.xz - uMin, uMax - vW.xz);
          float border = smoothstep(0.0, 0.12, min(d.x, d.y));
          float a = pow(e, 1.4) * uI * uOsc * border * 0.55;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return { geometry: g, material: m };
  }, [min, max, y, pattern, color]);
  useTimelineFrame((t) => {
    material.uniforms.uI.value = intensity(t);
    material.uniforms.uOsc.value = 0.55 + 0.45 * Math.abs(Math.cos(Math.PI * oscillation * t));
  });
  return <mesh geometry={geometry} material={material} renderOrder={14} />;
}
