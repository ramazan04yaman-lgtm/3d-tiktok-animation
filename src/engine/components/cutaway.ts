import * as THREE from 'three';

/**
 * A section cut defined by one plane. `keep` clips away everything in front of the plane,
 * `ghost` is the inverse plane so the removed half can be drawn as an x-ray silhouette.
 */
export class SectionCut {
  readonly keep: THREE.Plane;
  readonly ghost: THREE.Plane;
  constructor(normal: THREE.Vector3 = new THREE.Vector3(0, 0, -1)) {
    this.keep = new THREE.Plane(normal.clone().normalize(), 100);
    this.ghost = new THREE.Plane(normal.clone().normalize().negate(), -100);
  }
  /** Position the cut. `offset` = signed distance from the origin along -normal. 100 = nothing cut. */
  set(offset: number) {
    this.keep.constant = offset;
    this.ghost.constant = -offset;
  }
}

/**
 * Fresnel "x-ray" material for transparent technical housings (glowing edges, see-through faces).
 * Supports clipping planes.
 */
export function createXRayMaterial(color: THREE.ColorRepresentation = '#7fc4ff', clippingPlanes: THREE.Plane[] = []) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
      uPower: { value: 2.2 },
      uBase: { value: 0.06 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <clipping_planes_pars_vertex>
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
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
