/** Wolken, Atmosphäre, Sterne und Sonne. */
import * as THREE from 'three';
import type { EarthAssets } from './assets.ts';
import { FRAG_GLSL, GEO_GLSL } from './shaders.ts';

export function createClouds(a: EarthAssets): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { tClouds: { value: a.clouds }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uOpacity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vObj; varying vec3 vUpW; varying vec3 vWorld;
      void main() { vObj = normalize(position); vUpW = normalize(mat3(modelMatrix) * position);
        vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tClouds; uniform vec3 uSunDir; uniform float uOpacity, uTime;
      varying vec3 vObj; varying vec3 vUpW; varying vec3 vWorld;
      ${GEO_GLSL}
      ${FRAG_GLSL}
      void main() {
        vec2 uv = dirToUv(normalize(vObj));
        float c = sampleEq(tClouds, uv).r;
        float detail = fbm(vObj * 260.0 + uTime * 0.02);
        float a = smoothstep(0.12, 0.85, c * (0.85 + 0.3 * detail)) * uOpacity;
        float d = dot(normalize(vUpW), normalize(uSunDir));
        float lit = smoothstep(-0.2, 0.35, d);
        vec3 col = mix(srgb(vec3(0.10, 0.12, 0.22)), vec3(1.0), lit);
        col = mix(col, srgb(vec3(1.0, 0.62, 0.38)), smoothstep(-0.15, 0.05, d) * (1.0 - smoothstep(0.05, 0.3, d)) * 0.7);
        col *= 0.9 + 0.2 * detail;
        vec3 V = normalize(cameraPosition - vWorld);
        a *= smoothstep(0.0, 0.25, dot(normalize(vUpW), V)); // am Rand ausblenden
        gl_FragColor = vec4(col, a * 0.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.012, 256, 128), mat);
}

export function createAtmosphere(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: /* glsl */ `
      varying vec3 vNW; varying vec3 vWorld;
      void main() { vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir; varying vec3 vNW; varying vec3 vWorld;
      vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float rim = dot(-vNW, V);                         // 0 am äußersten Rand
        float edge = smoothstep(0.0, 0.36, rim);
        float sun = smoothstep(-0.25, 0.55, dot(normalize(vWorld), normalize(uSunDir)));
        vec3 col = mix(srgb(vec3(0.25, 0.55, 1.0)), srgb(vec3(0.6, 0.85, 1.0)), edge);
        float dusk = smoothstep(0.0, 0.35, sun) * (1.0 - smoothstep(0.35, 0.8, sun));
        col = mix(col, srgb(vec3(1.0, 0.55, 0.35)), dusk * 0.6);
        float a = pow(edge, 2.0) * (0.04 + 1.35 * sun);
        gl_FragColor = vec4(col * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.07, 128, 64), mat);
}

export function createStars(count = 6000): THREE.Points {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) { i--; continue; }
    v.normalize().multiplyScalar(90);
    pos.set([v.x, v.y, v.z], i * 3);
    const t = rnd();
    const c = new THREE.Color().setHSL(t < 0.7 ? 0.6 : t < 0.9 ? 0.12 : 0.0, 0.5, 0.75 + rnd() * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
    size[i] = Math.pow(rnd(), 6) * 5 + 0.9;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPixel: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float size; attribute vec3 color; varying vec3 vC; varying float vTw; uniform float uPixel, uTime;
      void main() { vC = color; vTw = 0.75 + 0.25 * sin(uTime * 1.5 + position.x * 13.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uPixel; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vTw;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * vTw, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

/** Leuchtende Sonne (Billboard) weit entfernt in Sonnenrichtung. */
export function createSun(): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,240,1)');
  grd.addColorStop(0.08, 'rgba(255,245,200,0.95)');
  grd.addColorStop(0.25, 'rgba(255,200,120,0.35)');
  grd.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(14);
  return s;
}
