/** GLSL-Bausteine, die mehrere Shader gemeinsam benutzen. */
export const GEO_GLSL = /* glsl */ `
const float PI = 3.141592653589793;
vec2 dirToUv(vec3 p) {
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(-p.z, p.x);
  return vec2(lon / (2.0 * PI) + 0.5, lat / PI + 0.5);
}
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

/** Nur im Fragment-Shader nutzbar (braucht Ableitungen dFdx/dFdy). */
export const FRAG_GLSL = /* glsl */ `
// Equirectangular-Textur ohne Naht-Artefakte an der Datumsgrenze
vec4 sampleEq(sampler2D t, vec2 uv) {
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  dx.x -= floor(dx.x + 0.5); dy.x -= floor(dy.x + 0.5);
  return textureGrad(t, uv, dx, dy);
}
`;
