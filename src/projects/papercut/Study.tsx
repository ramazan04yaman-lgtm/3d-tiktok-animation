import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { useTimelineFrame } from '../../engine/time';
import { paperTexture } from './PapercutModel';
import * as track from './script';

/**
 * Re-creation of the 2024 DTU experiment idea: three sheets of different thickness pressed onto
 * skin-like gel pads. Thin paper buckles, thick paper only dents the surface, ≈ 65 µm slices.
 * Thickness drawn strongly exaggerated (sheet x-size), values in the labels.
 */
export const SHEETS = [
  { dx: -0.85, th: 0.018, kind: 'thin' as const },
  { dx: 0, th: 0.045, kind: 'mid' as const },
  { dx: 0.85, th: 0.13, kind: 'thick' as const },
];
const PAD = { w: 0.62, h: 0.6, d: 0.8 };
const SH = 1.7;

function Pad({ x, y, kind }: { x: number; y: number; kind: 'thin' | 'mid' | 'thick' }) {
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#e3ad94', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color('#ffc9b0'), transparent: true });
    const u = { uDent: { value: 0 }, uSlit: { value: 0 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader =
        'uniform float uDent;\nvarying vec3 vP;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `vec3 transformed = position;
          float topW = smoothstep(${(PAD.h / 2 - 0.12).toFixed(3)}, ${(PAD.h / 2).toFixed(3)}, position.y);
          transformed.y -= uDent * topW * exp(-pow(position.x / 0.14, 2.0));
          vP = position;`,
        );
      sh.fragmentShader =
        'uniform float uSlit;\nvarying vec3 vP;\n' +
        sh.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float top = smoothstep(${(PAD.h / 2 - 0.02).toFixed(3)}, ${(PAD.h / 2).toFixed(3)}, vP.y);
          float slit = (1.0 - smoothstep(0.006, 0.016, abs(vP.x))) * uSlit * max(top, step(abs(vP.z), 0.39) * smoothstep(${(PAD.h / 2 - 0.2).toFixed(3)}, ${(PAD.h / 2).toFixed(3)}, vP.y) * step(0.39, abs(vP.z)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.06, 0.05), slit);`,
        );
    };
    m.customProgramCacheKey = () => 'mx-gel-pad';
    return { m, u };
  }, []);
  useTimelineFrame((t) => {
    const v = track.rig(t);
    mat.m.opacity = v;
    mat.m.visible = v > 0.002;
    const p = track.rigPress(t);
    mat.u.uDent.value = kind === 'thick' ? 0.11 * p : kind === 'mid' ? 0.02 * p : 0.005 * p;
    mat.u.uSlit.value = kind === 'mid' ? Math.min(1, p * 1.4) : 0;
  });
  return (
    <mesh position={[x, y, 0]} material={mat.m} castShadow receiveShadow>
      <boxGeometry args={[PAD.w, PAD.h, PAD.d, 48, 12, 24]} />
    </mesh>
  );
}

function Sheet({ x, yTop, th, kind }: { x: number; yTop: number; th: number; kind: 'thin' | 'mid' | 'thick' }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(th, SH, 0.75, 1, 32, 1), [th]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: paperTexture(), roughness: 0.85, sheen: 0.3, transparent: true }), []);
  useTimelineFrame((t) => {
    const v = track.rig(t);
    mat.opacity = v;
    mat.visible = v > 0.002;
    const p = track.rigPress(t);
    // bottom edge: lowered onto the pad (mid sinks in = cut, thick stops at the dent, thin stays on top and buckles)
    const sink = kind === 'mid' ? 0.2 * p : kind === 'thick' ? 0.1 * p : 0;
    const drop = kind === 'thin' ? 0.32 * p : 0;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const u = (by + SH / 2) / SH; // 0 at the edge, 1 at the top
      const bow = kind === 'thin' ? 0.24 * Math.sin(Math.PI * u) * Math.min(1, p * 1.2) : 0;
      pos.setXYZ(i, bx + bow, by - drop * u, base[i * 3 + 2]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    if (ref.current) ref.current.position.set(x, yTop + SH / 2 + 0.04 - sink - 0.04 * Math.min(1, p * 3), 0);
  });
  return <mesh ref={ref} geometry={geo} material={mat} castShadow />;
}

export function Study({ origin }: { origin: readonly [number, number, number] }) {
  const plinth = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#15171c', roughness: 0.35, metalness: 0.2, clearcoat: 0.6, transparent: true }), []);
  useTimelineFrame((t) => {
    const v = track.rig(t);
    plinth.opacity = v;
    plinth.visible = v > 0.002;
  });
  const [ox, oy, oz] = origin;
  const padY = oy - PAD.h / 2;
  return (
    <group name="StudyRig" position={[ox, 0, oz]}>
      <RoundedBox args={[2.8, padY - PAD.h / 2, 1.3]} radius={0.06} position={[0, (padY - PAD.h / 2) / 2, 0]} material={plinth} receiveShadow />
      {SHEETS.map((s) => (
        <group key={s.kind}>
          <Pad x={s.dx} y={padY} kind={s.kind} />
          <Sheet x={s.dx} yTop={oy} th={s.th} kind={s.kind} />
        </group>
      ))}
    </group>
  );
}
