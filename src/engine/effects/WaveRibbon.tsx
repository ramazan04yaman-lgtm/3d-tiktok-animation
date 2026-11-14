import { useMemo } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';

export interface WaveRibbonProps {
  /** centre line of the travelling wave */
  curve: THREE.Curve<THREE.Vector3>;
  /** 0..1: how far the wave front has travelled along the curve */
  head: (t: number) => number;
  intensity: (t: number) => number;
  /** displacement amplitude (scene units) */
  amplitude?: number;
  /** number of wave periods along the whole curve */
  cycles?: number;
  /** visual phase speed in periods per second (real microwaves: 2.45·10⁹ Hz — shown hugely slowed down) */
  speed?: number;
  width?: number;
  color?: THREE.ColorRepresentation;
  /** rotate the oscillation plane around the curve (radians) */
  twist?: number;
  phase?: number;
}

/**
 * Glowing sinusoidal ribbon travelling along a path — the series' symbol for an
 * electromagnetic wave. Displacement is computed on the GPU from a time uniform.
 */
export function WaveRibbon({ curve, head, intensity, amplitude = 0.05, cycles = 6, speed = 1.2, width = 0.012, color = '#5ab8ff', twist = 0, phase = 0 }: WaveRibbonProps) {
  const { geometry, material } = useMemo(() => {
    const N = 320;
    const frames = curve.computeFrenetFrames(N, false);
    const pos: number[] = [];
    const nrm: number[] = [];
    const bin: number[] = [];
    const sAttr: number[] = [];
    const side: number[] = [];
    const idx: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const p = curve.getPointAt(s);
      const tan = curve.getTangentAt(s);
      // stable normal: perpendicular to tangent, preferably in the plane containing world-up
      let n = new THREE.Vector3().crossVectors(tan, up);
      if (n.lengthSq() < 1e-4) n = frames.normals[i].clone();
      n.normalize();
      let b = new THREE.Vector3().crossVectors(tan, n).normalize();
      if (twist) {
        const n2 = n.clone().multiplyScalar(Math.cos(twist)).addScaledVector(b, Math.sin(twist));
        b = new THREE.Vector3().crossVectors(tan, n2).normalize();
        n = n2;
      }
      for (const sd of [-1, 1]) {
        pos.push(p.x, p.y, p.z);
        nrm.push(n.x, n.y, n.z);
        bin.push(b.x, b.y, b.z);
        sAttr.push(s);
        side.push(sd);
      }
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aNormal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('aBinormal', new THREE.Float32BufferAttribute(bin, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(sAttr, 1));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHead: { value: 0 },
        uIntensity: { value: 0 },
        uAmp: { value: amplitude },
        uCycles: { value: cycles },
        uSpeed: { value: speed },
        uWidth: { value: width },
        uPhase: { value: phase },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aNormal; attribute vec3 aBinormal; attribute float aS; attribute float aSide;
        uniform float uTime, uAmp, uCycles, uSpeed, uWidth, uPhase;
        varying float vS; varying float vSide;
        void main() {
          float ph = 6.2831853 * (aS * uCycles - uTime * uSpeed) + uPhase;
          vec3 p = position + aNormal * (uAmp * sin(ph));
          // ribbon width perpendicular to displacement so it reads from any angle
          p += aBinormal * aSide * uWidth;
          vS = aS; vSide = aSide;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uHead, uIntensity; uniform vec3 uColor;
        varying float vS; varying float vSide;
        void main() {
          float front = smoothstep(uHead, uHead - 0.06, vS);
          float tail = smoothstep(0.0, 0.04, vS);
          float edge = 1.0 - abs(vSide) * 0.35;
          float a = front * tail * edge * uIntensity;
          gl_FragColor = vec4(uColor * a * 2.2, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return { geometry: g, material: m };
  }, [curve, amplitude, cycles, speed, width, color, twist, phase]);

  useTimelineFrame((t) => {
    material.uniforms.uTime.value = t;
    material.uniforms.uHead.value = head(t) * 1.06;
    material.uniforms.uIntensity.value = intensity(t);
  });
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={16} />;
}
