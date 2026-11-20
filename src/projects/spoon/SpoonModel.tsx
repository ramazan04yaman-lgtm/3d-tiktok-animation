import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { envelope } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { BOWL, CRACK, spoonGeometry, woodTexture } from './wood';
import * as track from './script';

function withUV(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) * 0.9 + 0.5 + p.getZ(i) * 0.4;
    uv[i * 2 + 1] = p.getY(i) / 6.2;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** wood spoon material; the old spoon carries the dark crack line along the bowl */
function spoonMaterial(cracked: boolean) {
  const u = { uWetS: { value: 0 } };
  const m = new THREE.MeshPhysicalMaterial({ map: woodTexture(), roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color('#ffd9a8'), transparent: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader =
      'uniform float uWetS;\nvarying vec3 vP;\n' +
      sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        diffuseColor.rgb *= 1.0 - 0.25 * uWetS;
        ${
          cracked
            ? `{
          float along = smoothstep(${CRACK.y0.toFixed(3)}, ${(CRACK.y0 + 0.12).toFixed(3)}, vP.y) * (1.0 - smoothstep(${(CRACK.y1 - 0.12).toFixed(3)}, ${CRACK.y1.toFixed(3)}, vP.y));
          float cx = ${CRACK.x.toFixed(3)} + 0.012 * sin(vP.y * 6.0) + 0.004 * sin(vP.y * 31.0);
          float d = abs(vP.x - cx);
          float front = step(0.0, vP.z);
          float line = (1.0 - smoothstep(0.0025, 0.006, d)) * along * front;
          float stain = (1.0 - smoothstep(0.006, 0.05, d)) * along * front;
          diffuseColor.rgb *= 1.0 - 0.35 * stain;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.035, 0.02), line);
        }`
            : ''
        }`,
      );
  };
  m.customProgramCacheKey = () => `mx-spoon-${cracked}`;
  return { m, u };
}

export function SpoonModel() {
  const geo = useMemo(() => withUV(spoonGeometry()), []);
  const old = useMemo(() => spoonMaterial(true), []);
  const fresh = useMemo(() => spoonMaterial(false), []);
  const oldRef = useRef<THREE.Group>(null);
  const newRef = useRef<THREE.Group>(null);
  const stream = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 7.6, 0.25), new THREE.Vector3(0.05, 6.2, 0.2), new THREE.Vector3(0.02, 5.4, 0.12), new THREE.Vector3(0.0, 4.6, 0.25), new THREE.Vector3(0.0, 3.6, 0.5)], false, 'centripetal'), []);
  useTimelineFrame((t) => {
    const v = track.spoonVis(t);
    const sw = track.swap(t);
    old.m.opacity = v * (1 - 0.55 * sw);
    old.m.visible = v > 0.002;
    old.m.depthWrite = v > 0.5;
    old.u.uWetS.value = envelope(t, 53.0, 53.6, 55.6, 57.0);
    fresh.m.opacity = sw;
    fresh.m.visible = sw > 0.002;
    if (oldRef.current) oldRef.current.position.set(-0.35 * sw, 0, -0.6 * sw);
    if (newRef.current) {
      newRef.current.position.set(1.35, -1.2 * (1 - sw), 0.1);
      newRef.current.rotation.z = -0.08;
    }
  });
  return (
    <group name="Spoons">
      <group ref={oldRef}>
        <mesh name="OldSpoon" geometry={geo} material={old.m} castShadow receiveShadow />
      </group>
      <group ref={newRef}>
        <mesh name="NewSpoon" geometry={geo} material={fresh.m} castShadow receiveShadow />
      </group>
      {/* rinsing by hand */}
      <FlowParticles curve={stream} intensity={(t) => envelope(t, 53.0, 53.4, 55.2, 55.8)} count={90} speed={3.2} size={0.02} stretch={3} color="#cfeaff" glow={1.2} spread={0.05} />
    </group>
  );
}

export { BOWL };
