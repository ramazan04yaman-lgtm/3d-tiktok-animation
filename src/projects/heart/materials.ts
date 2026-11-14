import * as THREE from 'three';
import { DISPLACE_GLSL, HEART } from './anatomy';

export interface BeatUniforms {
  uV: { value: number };
  uA: { value: number };
}

/**
 * Heart tissue: physically based, wet (clear coat), vertex-coloured (muscle, fat, vessels),
 * deformed per vertex by the beat (same function as in TS). Back faces seen through the section
 * plane are shaded as the cut surface of the myocardium / vessel wall.
 */
export function createHeartMaterial(beat: BeatUniforms, clippingPlanes: THREE.Plane[]) {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
    sheen: 0.45,
    sheenColor: new THREE.Color('#ff8a78'),
    sheenRoughness: 0.45,
    side: THREE.DoubleSide,
    clippingPlanes,
  });
  const uCut = { value: new THREE.Color('#8a2a24') };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uV = beat.uV;
    sh.uniforms.uA = beat.uA;
    sh.uniforms.uCut = uCut;
    sh.vertexShader = DISPLACE_GLSL + '\nvarying vec3 vLocal;\nvarying float vInner;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = heartDisplace(position);\nvLocal = position;\nvInner = aBeat.z;');
    sh.fragmentShader =
      'uniform vec3 uCut;\nvarying vec3 vLocal;\nvarying float vInner;\n' +
      sh.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        // depth cue inside the opened chambers: the further behind the section plane, the darker
        if (gl_FrontFacing && vInner > 0.5) {
          float db = max(0.0, ${HEART.cutZ.toFixed(3)} - vLocal.z);
          gl_FragColor.rgb *= 1.0 - 0.55 * smoothstep(0.0, 0.2, db);
        }
        if (!gl_FrontFacing) {
          // cut surface: muscle fibres (subtle stripes) tinted by the wall it belongs to
          float fib = 0.5 + 0.5 * sin(vLocal.y * 160.0 + sin(vLocal.x * 40.0) * 2.0);
          vec3 cc = mix(uCut, vColor.rgb * 1.05, 0.4) * (0.82 + 0.18 * fib);
          gl_FragColor = vec4(cc, 1.0);
        }`,
      );
  };
  m.customProgramCacheKey = () => 'mx-heart-tissue';
  return m;
}

/** Fresnel x-ray ghost of the removed half — deforms with the beat as well. */
export function createHeartGhost(beat: BeatUniforms, clippingPlanes: THREE.Plane[], color = '#ffb3a6') {
  return new THREE.ShaderMaterial({
    uniforms: { uV: beat.uV, uA: beat.uA, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uPower: { value: 2.4 }, uBase: { value: 0.03 } },
    vertexShader: /* glsl */ `
      #include <common>
      #include <clipping_planes_pars_vertex>
      ${DISPLACE_GLSL}
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 transformed = heartDisplace(position);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPower;
      uniform float uBase;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        #include <clipping_planes_fragment>
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
        float a = (uBase + f) * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    clipping: true,
    clippingPlanes,
    toneMapped: false,
  });
}
