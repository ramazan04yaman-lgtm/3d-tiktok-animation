import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { surfaceNets } from '../../engine/geometry/surfaceNets';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { CUT, EDGE } from './finger';
import * as track from './script';

/**
 * Magnified skin section at the cut (fingertip = thick skin): stratum corneum, living epidermis with
 * rete ridges, dermis with capillary loops and the vascular plexus, subcutaneous fat, nerve fibres
 * with free nerve endings reaching into the epidermis. The cut is a shallow V through the epidermis
 * into the papillary dermis. Section plane z = ZC faces the camera.
 */
/** block frame: skin surface faces +y, the cut runs along z (into the screen), section plane z = ZC */
export const YT = CUT.y + 0.28;
const ZB = EDGE.z - 0.15;
export const ZC = ZB + 0.15;
const DEPTH = 0.56;
const NOTCH = 0.17;
/** u = position across the cut (x), h = depth below the surface, back = distance behind the section plane */
const Q = (u: number, h: number, back = 0.02) => new THREE.Vector3(u, YT - h, ZC - back);

function sdBlock(x: number, y: number, z: number) {
  const a = x;
  const b = z - ZB;
  const h = YT - y;
  const top = -0.008 * Math.sin((a / 0.045) * Math.PI * 2);
  let d = Math.max(Math.abs(a) - 0.4, Math.abs(b) - 0.3, h - DEPTH, top - h);
  // V-shaped cut, slightly opened
  const wid = 0.004 + 0.032 * Math.max(0, 1 - h / NOTCH);
  d = Math.max(d, -Math.max(Math.abs(a) - wid, h - NOTCH));
  return d;
}

const LAYER_GLSL = /* glsl */ `
  vec3 skinLayer(vec3 p) {
    float a = p.x;
    float b = p.z - ${ZB.toFixed(3)};
    float h = ${YT.toFixed(3)} - p.y;
    float ed = 0.12 + 0.022 * sin(a * 45.0) * sin(b * 45.0 + 1.0);
    vec3 c;
    if (h < 0.035) c = vec3(0.90, 0.76, 0.6);
    else if (h < ed) c = mix(vec3(0.86, 0.62, 0.53), vec3(0.66, 0.45, 0.38), smoothstep(ed - 0.015, ed, h));
    else if (h < 0.42) {
      float fib = 0.5 + 0.5 * sin(b * 160.0 + sin(h * 60.0) * 2.0 + a * 30.0);
      c = mix(vec3(0.80, 0.49, 0.47), vec3(0.88, 0.62, 0.58), 0.25 * fib) * mix(1.0, 0.92, smoothstep(0.12, 0.2, h));
    } else {
      float lob = 0.5 + 0.5 * sin(b * 70.0) * sin(a * 70.0 + h * 50.0);
      c = mix(vec3(0.93, 0.78, 0.42), vec3(0.85, 0.66, 0.34), lob * 0.6);
    }
    return pow(c, vec3(2.2)); // sRGB → linear
  }
`;

export function SkinBlock() {
  const group = useRef<THREE.Group>(null);
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), ZC), []);
  const geo = useMemo(() => {
    const block = surfaceNets(sdBlock, { min: [-0.42, YT - DEPTH - 0.02, ZB - 0.32], max: [0.42, YT + 0.03, ZB + 0.32], step: 0.008, project: 2 });
    // vessels: arteriole (red) and venule (blue) plexus + capillary loops into the dermal papillae
    const art: THREE.BufferGeometry[] = [];
    const ven: THREE.BufferGeometry[] = [];
    const tube = (pts: THREE.Vector3[], r: number) => {
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 6), r, 8);
      g.deleteAttribute('uv');
      return g.toNonIndexed();
    };
    art.push(tube([Q(-0.4, 0.33), Q(-0.1, 0.32), Q(0.1, 0.335), Q(0.4, 0.33)], 0.012));
    ven.push(tube([Q(-0.4, 0.36, 0.05), Q(-0.1, 0.355, 0.05), Q(0.1, 0.37, 0.05), Q(0.4, 0.36, 0.05)], 0.015));
    for (let b = -0.35; b <= 0.36; b += 0.07) {
      const top = 0.13 + 0.01 * Math.sin(b * 40);
      art.push(tube([Q(b - 0.012, 0.32), Q(b - 0.014, 0.22), Q(b - 0.008, top + 0.01), Q(b, top)], 0.0045));
      ven.push(tube([Q(b, top), Q(b + 0.008, top + 0.01, 0.03), Q(b + 0.014, 0.22, 0.04), Q(b + 0.012, 0.355, 0.05)], 0.0055));
    }
    // nerves: deep trunk, ascending fibres, free endings in the epidermis
    const nerve: THREE.BufferGeometry[] = [];
    const paths: THREE.CatmullRomCurve3[] = [];
    nerve.push(tube([Q(-0.4, 0.47, 0.06), Q(0, 0.46, 0.06), Q(0.4, 0.48, 0.06)], 0.02));
    for (let i = 0; i < 16; i++) {
      const b0 = -0.36 + i * 0.048 + (hash2(i, 1) - 0.5) * 0.02;
      const back = 0.012 + 0.03 * hash2(i, 2);
      const pts = [Q(b0 * 0.6, 0.46, 0.06), Q(b0 * 0.8, 0.34, back), Q(b0, 0.2, back), Q(b0 + (hash2(i, 3) - 0.5) * 0.02, 0.12, back), Q(b0 + (hash2(i, 4) - 0.5) * 0.03, 0.055 + 0.02 * hash2(i, 5), back)];
      nerve.push(tube(pts, 0.0042));
      // severed endings (at the cut) carry the pain signal back down
      if (Math.abs(b0) < 0.06) paths.push(new THREE.CatmullRomCurve3([...pts].reverse().concat([Q(0.2, 0.465, 0.06), Q(0.4, 0.48, 0.06)])));
    }
    // a few mechanoreceptors (Meissner corpuscles) in the papillae
    const corp: THREE.BufferGeometry[] = [];
    for (const b of [-0.27, -0.12, 0.13, 0.28]) {
      const sph = new THREE.SphereGeometry(1, 12, 10);
      sph.scale(0.012, 0.024, 0.012);
      const c = Q(b + 0.03, 0.125, 0.02);
      sph.translate(c.x, c.y, c.z);
      sph.deleteAttribute('uv');
      corp.push(sph.toNonIndexed());
    }
    return { block, art: mergeGeometries(art), ven: mergeGeometries(ven), nerve: mergeGeometries([...nerve, ...corp]), paths };
  }, []);
  const mats = useMemo(() => {
    const tissue = new THREE.MeshPhysicalMaterial({ roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ffd0c0'), clearcoat: 0.2, side: THREE.DoubleSide, clippingPlanes: [clip], transparent: true });
    tissue.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec3 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader =
        'varying vec3 vW;\n' +
        LAYER_GLSL +
        sh.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = skinLayer(vW);')
          .replace(
            '#include <opaque_fragment>',
            `#include <opaque_fragment>
            if (!gl_FrontFacing) {
              // section face: colour of the tissue where the view ray crosses the section plane
              vec3 d = vW - cameraPosition;
              float k = (${ZC.toFixed(3)} - cameraPosition.z) / d.z;
              vec3 p = cameraPosition + d * k;
              gl_FragColor = vec4(skinLayer(p) * 0.92, gl_FragColor.a);
            }`,
          );
    };
    tissue.customProgramCacheKey = () => 'mx-skin-block';
    const art = new THREE.MeshPhysicalMaterial({ color: '#c9302a', roughness: 0.35, clearcoat: 0.6, emissive: '#ff2a1a', emissiveIntensity: 0, transparent: true });
    const ven = new THREE.MeshPhysicalMaterial({ color: '#3f4fa8', roughness: 0.35, clearcoat: 0.6, emissive: '#3050ff', emissiveIntensity: 0, transparent: true });
    const nerve = new THREE.MeshPhysicalMaterial({ color: '#f2d36b', roughness: 0.4, clearcoat: 0.4, emissive: '#ffcf3a', emissiveIntensity: 0, transparent: true });
    const blood = new THREE.MeshPhysicalMaterial({ color: '#8f0d0d', roughness: 0.1, clearcoat: 1, transparent: true });
    return { tissue, art, ven, nerve, blood };
  }, [clip]);
  const drop = useRef<THREE.Mesh>(null);

  useTimelineFrame((t) => {
    const v = track.block(t);
    if (group.current) group.current.visible = v > 0.002;
    for (const m of Object.values(mats)) {
      m.opacity = v;
      m.depthWrite = v > 0.5;
    }
    const vs = track.vessels(t);
    mats.art.emissiveIntensity = 0.6 * vs;
    mats.ven.emissiveIntensity = 0.5 * vs;
    mats.nerve.emissiveIntensity = 0.25 + 1.4 * track.nerves(t) * (0.8 + 0.2 * Math.sin(t * 7));
    mats.nerve.emissive.set('#ffcf3a').lerp(new THREE.Color('#ff5a2a'), track.pain(t) * (0.6 + 0.4 * Math.sin(t * 9)));
    if (drop.current) drop.current.scale.setScalar(0.004 + 0.012 * Math.min(1, Math.max(0, (t - 28.5) / 3)));
  });

  return (
    <group ref={group} name="SkinSection">
      <mesh geometry={geo.block} material={mats.tissue} castShadow receiveShadow />
      <mesh geometry={geo.art} material={mats.art} />
      <mesh geometry={geo.ven} material={mats.ven} />
      <mesh geometry={geo.nerve} material={mats.nerve} />
      <mesh ref={drop} material={mats.blood} position={[0, YT - NOTCH + 0.02, ZC - 0.03]}>
        <sphereGeometry args={[1, 20, 14]} />
      </mesh>
      {geo.paths.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={track.pain} count={8} travel={(t) => t * 0.35 + i * 0.05} size={0.006} stretch={2.4} color="#ff7a3a" glow={2.6} />
      ))}
    </group>
  );
}
