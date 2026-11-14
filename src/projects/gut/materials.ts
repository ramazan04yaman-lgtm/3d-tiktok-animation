import * as THREE from 'three';

export const MAX_RINGS = 12;

export interface GutUniforms {
  /** arc-length positions of contraction rings (dm) */
  uRings: { value: number[] };
  /** squeeze per ring (0..1 of the radius) */
  uRingAmp: { value: number[] };
  uRingW: { value: number };
  /** longitudinal section: fragments whose radial direction points along uCutDir more than uCutT are removed */
  uCutDir: { value: THREE.Vector3 };
  /** second cut direction, blended in from arc length uCutBlend.x to uCutBlend.y (e.g. sagittal cut of the rectum) */
  uCutDir2: { value: THREE.Vector3 };
  uCutBlend: { value: THREE.Vector2 };
  uCutT: { value: number };
  /** only cut where uCutS.x ≤ s ≤ uCutS.y */
  uCutS: { value: THREE.Vector2 };
  uMucosa: { value: THREE.Color };
  uFold: { value: number };
  /** anal canal only: opening of the upper (internal sphincter) and lower (external sphincter) part, vibration */
  uOpen: { value: THREE.Vector3 };
  uTime: { value: number };
}

export function gutUniforms(mucosa: THREE.ColorRepresentation, fold: number): GutUniforms {
  return {
    uRings: { value: new Array(MAX_RINGS).fill(-100) },
    uRingAmp: { value: new Array(MAX_RINGS).fill(0) },
    uRingW: { value: 0.16 },
    uCutDir: { value: new THREE.Vector3(0, 0, 1) },
    uCutDir2: { value: new THREE.Vector3(0, 0, 1) },
    uCutBlend: { value: new THREE.Vector2(1e5, 1e5 + 1) },
    uCutT: { value: 1.5 },
    uCutS: { value: new THREE.Vector2(-1, 1e5) },
    uMucosa: { value: new THREE.Color(mucosa) },
    uFold: { value: fold },
    uOpen: { value: new THREE.Vector3(0, 0, 0) },
    uTime: { value: 0 },
  };
}

/**
 * Wet visceral tissue (serosa outside, mucosa inside). Peristaltic rings squeeze the tube in the
 * vertex shader; a longitudinal section removes the half facing the camera so contents are visible.
 * The wall thickness shows as a darker rim along the section edge.
 */
export function createGutMaterial(u: GutUniforms, opts: { canal?: boolean; clippingPlanes?: THREE.Plane[] } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.4,
    clearcoat: 0.65,
    clearcoatRoughness: 0.25,
    sheen: 0.5,
    sheenColor: new THREE.Color('#ffb7a6'),
    sheenRoughness: 0.5,
    side: THREE.DoubleSide,
    clippingPlanes: opts.clippingPlanes ?? [],
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader =
      `attribute float aS;\nattribute float aR;\nattribute vec3 aRad;\nuniform float uRings[${MAX_RINGS}];\nuniform float uRingAmp[${MAX_RINGS}];\nuniform float uRingW;\nuniform vec3 uOpen;\nuniform float uTime;\nuniform vec3 uCutDir;\nuniform vec3 uCutDir2;\nuniform vec2 uCutBlend;\nvarying float vS;\nvarying float vDot;\n` +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `float sq = 0.0;
        for (int i = 0; i < ${MAX_RINGS}; i++) { float d = (aS - uRings[i]) / uRingW; sq += uRingAmp[i] * exp(-d * d); }
        sq = min(sq, 0.72);
        vec3 transformed = position - aRad * aR * sq;
        ${
          opts.canal
            ? `// anal canal: upper part opened by the internal sphincter, lower part by the external one
        float up = 1.0 - smoothstep(0.12, 0.26, aS);
        float lo = smoothstep(0.14, 0.28, aS);
        float vib = uOpen.z * sin(uTime * 41.0 + aS * 30.0) * smoothstep(0.22, 0.4, aS);
        transformed += aRad * (0.055 * (uOpen.x * up + uOpen.y * lo) + 0.012 * vib);`
            : ''
        }
        vS = aS;
        vec3 cd = normalize(mix(uCutDir, uCutDir2, smoothstep(uCutBlend.x, uCutBlend.y, aS)));
        vDot = dot(aRad, cd);`,
      );
    sh.fragmentShader =
      'uniform float uCutT;\nuniform vec2 uCutS;\nuniform vec3 uMucosa;\nuniform float uFold;\nvarying float vS;\nvarying float vDot;\n' +
      sh.fragmentShader
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          bool inCut = vS >= uCutS.x && vS <= uCutS.y;
          if (inCut && vDot > uCutT) discard;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          if (!gl_FrontFacing) {
            // mucosa: velvety, with circular folds (semilunar folds in the colon, Kerckring folds in the small intestine)
            float f = 0.5 + 0.5 * cos(vS * uFold);
            diffuseColor.rgb = uMucosa * (0.72 + 0.28 * f);
          }
          float rim = inCut ? 1.0 - smoothstep(0.0, 0.07, uCutT - vDot) : 0.0;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.16, 0.13), rim * step(uCutT, 1.2));`,
        );
  };
  m.customProgramCacheKey = () => (opts.canal ? 'mx-gut-canal' : 'mx-gut');
  return m;
}
