/**
 * Der Erd-Shader: berechnet für jeden Bildpunkt, ob dort Land, Wasser oder
 * trockengefallener Meeresboden ist – anhand ECHTER Höhen- und Tiefendaten (ETOPO1).
 * Sinkt der Meeresspiegel (uSeaLevel), wird automatisch neuer Boden sichtbar.
 */
import * as THREE from 'three';
import type { EarthAssets } from './assets.ts';
import { EARTH_RADIUS_M } from './geo.ts';
import { FRAG_GLSL, GEO_GLSL } from './shaders.ts';

export const RELIEF_EXAGGERATION = 7; // Höhen für die Optik übertrieben (Cartoon-Relief)

export function createEarthMaterial(a: EarthAssets): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tElev: { value: a.elevation },
      tLand: { value: a.land },
      tMask: { value: a.mask },
      tClouds: { value: a.clouds },
      tNight: { value: a.night },
      uSeaLevel: { value: 0 },          // Meter
      uLakeDrain: { value: 0 },         // 0..1
      uRiverDrain: { value: 0 },        // 0..1
      uDryness: { value: 0 },           // 0..1
      uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
      uTime: { value: 0 },
      uCloudRot: { value: 0 },
      uDisp: { value: RELIEF_EXAGGERATION / EARTH_RADIUS_M },
      uNormalStrength: { value: 18 },
      uHaze: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      uniform sampler2D tElev; uniform sampler2D tMask;
      uniform float uSeaLevel; uniform float uDisp;
      varying vec3 vObj; varying vec3 vWorld; varying vec3 vUpW;
      ${GEO_GLSL}
      void main() {
        vec3 p = normalize(position);
        vec2 uv = dirToUv(p);
        float e = textureLod(tElev, uv, 0.0).r;
        float ocean = textureLod(tMask, uv, 0.0).r;
        float h = ocean > 0.5 ? max(e, uSeaLevel) : max(e, 0.0);
        vec3 pos = p * (1.0 + h * uDisp);
        vObj = p;
        vec4 w = modelMatrix * vec4(pos, 1.0);
        vWorld = w.xyz;
        vUpW = normalize(mat3(modelMatrix) * p);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tElev, tLand, tMask, tClouds, tNight;
      uniform float uSeaLevel, uLakeDrain, uRiverDrain, uDryness, uTime, uCloudRot, uNormalStrength, uHaze;
      uniform vec3 uSunDir;
      varying vec3 vObj; varying vec3 vWorld; varying vec3 vUpW;
      ${GEO_GLSL}
      ${FRAG_GLSL}

      float elevAt(vec2 uv) { return texture(tElev, uv).r; }

      void main() {
        vec3 p = normalize(vObj);
        vec2 uv = dirToUv(p);
        float lat = (uv.y - 0.5) * PI, lon = (uv.x - 0.5) * 2.0 * PI;
        float e = elevAt(uv);
        vec4 m = sampleEq(tMask, uv);

        // ---------- Relief-Normale aus Höhendaten ----------
        const float R = 6371000.0;
        vec2 px = vec2(1.0 / 2160.0, 1.0 / 1080.0);
        float eE = elevAt(uv + vec2(px.x, 0.0)), eW = elevAt(uv - vec2(px.x, 0.0));
        float eN = elevAt(uv + vec2(0.0, px.y)), eS = elevAt(uv - vec2(0.0, px.y));
        float dEast = 2.0 * PI * R * max(cos(lat), 0.02) / 2160.0 * 2.0;
        float dNorth = PI * R / 1080.0 * 2.0;
        vec3 east = vec3(-sin(lon), 0.0, -cos(lon));
        vec3 north = vec3(-sin(lat) * cos(lon), cos(lat), sin(lat) * sin(lon));
        vec3 nObj = normalize(p - uNormalStrength * ((eE - eW) / dEast * east + (eN - eS) / dNorth * north));
        vec3 nTerrain = nObj; // Erde ist nicht gedreht -> Objekt- = Weltkoordinaten
        vec3 up = normalize(vUpW);

        // ---------- Wasser bestimmen ----------
        float oceanMask = smoothstep(0.35, 0.65, m.r);
        float depth = uSeaLevel - e;                     // >0: unter Wasser
        float aa = max(fwidth(depth), 1.0);
        float sea = clamp(depth / aa + 0.5, 0.0, 1.0) * oceanMask;
        float lakeIn = step(0.01, m.g);
        float lake = lakeIn * smoothstep(uLakeDrain, uLakeDrain + 0.05, m.g);
        float river = 0.6 * m.b * (1.0 - smoothstep(0.0, 1.0, uRiverDrain)) * (1.0 - oceanMask);

        // ---------- Landfarbe (Satellitenbild, kräftig wie Cartoon) ----------
        vec3 land = sampleEq(tLand, uv).rgb;
        float lum = dot(land, vec3(0.299, 0.587, 0.114));
        land = mix(vec3(lum), land, 1.35);                       // Sättigung
        land = pow(land, vec3(0.92)) * 1.08;                     // etwas heller
        land *= 0.9 + 0.2 * fbm(p * 1500.0);                     // Details für Nahaufnahmen
        float green = clamp((land.g - max(land.r, land.b)) * 6.0, 0.0, 1.0);
        vec3 desert = srgb(vec3(0.84, 0.68, 0.42)) * (0.6 + lum * 1.5);
        land = mix(land, desert, green * uDryness * 0.85);       // Erde wird trockener
        land = mix(land, land * vec3(1.08, 0.98, 0.85), uDryness * 0.5);

        // ---------- Trockengefallener Meeresboden ----------
        float n1 = fbm(p * 90.0), n2 = fbm(p * 700.0);
        float t = clamp(-e / 6500.0, 0.0, 1.0);
        vec3 shelf = srgb(vec3(0.93, 0.80, 0.56)), slope = srgb(vec3(0.78, 0.58, 0.40));
        vec3 abyss = srgb(vec3(0.60, 0.46, 0.40)), trench = srgb(vec3(0.38, 0.28, 0.30));
        vec3 floorCol = mix(shelf, slope, smoothstep(0.0, 0.12, t));
        floorCol = mix(floorCol, abyss, smoothstep(0.15, 0.55, t));
        floorCol = mix(floorCol, trench, smoothstep(0.75, 1.0, t));
        // Sedimente: Schlamm-, Sand- und Algenflecken in mehreren Größen
        float n3 = fbm(p * 30.0);
        floorCol = mix(floorCol, srgb(vec3(0.58, 0.50, 0.36)), smoothstep(0.45, 0.75, n3) * 0.7 * (1.0 - t));
        floorCol = mix(floorCol, srgb(vec3(0.62, 0.66, 0.42)), smoothstep(0.55, 0.8, n1) * 0.45 * (1.0 - smoothstep(0.0, 0.05, t)));
        floorCol = mix(floorCol, srgb(vec3(0.85, 0.62, 0.48)), smoothstep(0.5, 0.8, fbm(p * 12.0 + 7.0)) * 0.5 * smoothstep(0.1, 0.4, t));
        floorCol *= 0.8 + 0.3 * n1 + 0.14 * n2;
        float above = -depth;                                    // Meter über dem Wasser
        float salt = (1.0 - smoothstep(0.0, 90.0, above)) * smoothstep(0.45, 0.7, n2 + 0.25 * n1);
        floorCol = mix(floorCol, srgb(vec3(0.97, 0.96, 0.92)), salt * 0.8);    // Salzkrusten am neuen Ufer
        floorCol = mix(floorCol * 0.55, floorCol, smoothstep(0.0, 3.0 * aa, above)); // nasser Rand
        floorCol = mix(land, floorCol, smoothstep(-1.0, -25.0, e) * oceanMask);

        vec3 ground = oceanMask > 0.0 ? mix(land, floorCol, oceanMask) : land;
        // ausgetrocknete Seen: Salzpfannen
        ground = mix(ground, srgb(vec3(0.95, 0.92, 0.84)) * (0.85 + 0.2 * n2), lakeIn * (1.0 - lake) * 0.9);
        // ausgetrocknete Flussbetten
        ground = mix(ground, ground * srgb(vec3(0.75, 0.62, 0.5)), m.b * uRiverDrain * 0.7);

        // ---------- Wasserfarbe ----------
        vec3 wShallow = srgb(vec3(0.22, 0.92, 0.90)), wMid = srgb(vec3(0.08, 0.55, 0.95)), wDeep = srgb(vec3(0.03, 0.16, 0.50));
        vec3 water = mix(wShallow, wMid, smoothstep(0.0, 150.0, depth));
        water = mix(water, wDeep, smoothstep(300.0, 4500.0, depth));
        vec3 lakeCol = srgb(vec3(0.12, 0.62, 0.85));
        // Wellen
        vec3 q = p * 420.0 + vec3(uTime * 0.25, uTime * 0.18, -uTime * 0.2);
        vec3 wave = vec3(fbm(q) - 0.5, fbm(q + 17.3) - 0.5, fbm(q + 31.7) - 0.5);
        vec3 nWater = normalize(up + 0.16 * (wave - up * dot(wave, up)));
        // Schaum-Linie an der Küste (Cartoon-Kontur)
        float foam = (1.0 - smoothstep(0.0, 2.5 * aa, depth)) * sea;
        foam *= 0.7 + 0.3 * sin(uTime * 2.0 + n1 * 20.0);

        float wet = max(sea, lake);
        vec3 albedo = mix(ground, mix(water, lakeCol, lake * (1.0 - sea)), wet);
        albedo = mix(albedo, srgb(vec3(0.16, 0.5, 0.9)), river * (1.0 - wet));
        albedo = mix(albedo, vec3(1.0), foam * 0.85);

        // ---------- Licht ----------
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 N = normalize(mix(nTerrain, nWater, wet));
        float day = smoothstep(-0.18, 0.22, dot(up, L));
        float lam = clamp(dot(N, L), 0.0, 1.0);
        vec3 col = albedo * (0.035 + day * (0.18 + 1.05 * lam));
        // Wolkenschatten
        float cs = sampleEq(tClouds, uv - vec2(uCloudRot / (2.0 * PI), 0.0) + vec2(0.002, 0.0)).r;
        col *= 1.0 - 0.45 * smoothstep(0.2, 0.9, cs) * day;
        // Spiegelung der Sonne + Himmel auf dem Wasser
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 320.0) * 1.1 + pow(max(dot(N, H), 0.0), 40.0) * 0.05;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
        col += wet * day * (spec * srgb(vec3(1.0, 0.95, 0.85)) + fres * 0.35 * srgb(vec3(0.55, 0.78, 1.0)));
        // Abendrot an der Tag-Nacht-Grenze
        float dusk = smoothstep(-0.15, 0.05, dot(up, L)) * (1.0 - smoothstep(0.05, 0.3, dot(up, L)));
        col += albedo * dusk * srgb(vec3(1.0, 0.45, 0.2)) * 0.35;
        // Stadtlichter auf der Nachtseite
        float lights = smoothstep(0.18, 0.75, sampleEq(tNight, uv).r) * (1.0 - wet);
        col += srgb(vec3(1.0, 0.72, 0.38)) * lights * (1.0 - day) * 1.6;
        // Atmosphärischer Dunst am Rand
        float rim = pow(1.0 - max(dot(up, V), 0.0), 2.5);
        col = mix(col, srgb(vec3(0.38, 0.65, 1.0)) * (0.15 + day), rim * uHaze);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
