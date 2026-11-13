/**
 * DIORAMA – detaillierte 3D-Umgebung für Nahaufnahmen der Einwohner (Hof von Mensch Nr. 1, Dorf).
 * Gleicher Stil wie die Figuren: glatte Materialien, kräftige schwarze Konturen, klare Farben.
 * Einheit: 1 = eine Figurenhöhe-Einheit (wird beim Platzieren auf die Erde skaliert).
 * Mit Himmelskuppel + Nebel am Horizont: Beim Heranfliegen entsteht eine echte kleine Welt.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { outlineMaterial, smooth } from './characters.ts';

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const grasTex = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#79c94f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * 512, y = rnd() * 512, l = 4 + rnd() * 7;
    g.strokeStyle = `hsl(${95 + rnd() * 20}, ${55 + rnd() * 20}%, ${38 + rnd() * 22}%)`;
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - l); g.stroke();
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = ['#fff', '#ffd23a', '#ff8fb0'][i % 3]; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 2.5, 0, 7); g.fill(); }
}, 14);
const wegTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = '#d8c39a'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -16 : 0; x < 256; x += 32) {
    g.fillStyle = `hsl(35, ${25 + rnd() * 15}%, ${66 + rnd() * 10}%)`;
    g.beginPath(); g.roundRect(x + 2, y + 2, 28, 28, 7); g.fill();
    g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 2; g.stroke();
  }
}, 2);
const dachTex = (farbe: string) => canvasTex(128, 128, (g) => {
  g.fillStyle = farbe; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 128; x += 16) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + 8, y + 14, 8, 0, Math.PI); g.fill();
  }
}, 2);

/** Teil mit glattem Material + schwarzer Kontur (wie die Figuren). */
function teil(geo: THREE.BufferGeometry, mat: THREE.Material | string, kontur = 0.03): THREE.Mesh {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? smooth(mat, { roughness: 0.55 }) : mat);
  m.castShadow = true; m.receiveShadow = true;
  if (kontur > 0) m.add(new THREE.Mesh(geo, outlineMaterial(kontur)));
  return m;
}

function haus(wand: string, dach: string, h = 2.2): THREE.Group {
  const g = new THREE.Group();
  const w = 3.2, d = 2.8;
  const wall = teil(new THREE.BoxGeometry(w, h, d), wand); wall.position.y = h / 2;
  const roofGeo = new THREE.CylinderGeometry(0.01, w * 0.86, 1.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, d / w + 0.08);
  const roof = teil(roofGeo, smooth('#ffffff', { map: dachTex(dach), roughness: 0.6 }));
  roof.position.y = h + 0.78;
  const chim = teil(new THREE.BoxGeometry(0.4, 0.9, 0.4), '#b05a42'); chim.position.set(w * 0.25, h + 1.1, -0.3);
  const door = teil(new THREE.BoxGeometry(0.7, 1.25, 0.08), '#8a5a33', 0.02); door.position.set(-0.6, 0.62, d / 2 + 0.03);
  const knob = teil(new THREE.SphereGeometry(0.05, 8, 6), '#ffd23a', 0); knob.position.set(-0.36, 0.62, d / 2 + 0.09);
  g.add(wall, roof, chim, door, knob);
  // Fenster mit Rahmen, Glas und Blumenkasten
  for (const x of [0.75]) {
    const frame = teil(new THREE.BoxGeometry(0.85, 0.75, 0.08), '#ffffff', 0.02); frame.position.set(x, 1.3, d / 2 + 0.03);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.56), smooth('#9fdcff', { roughness: 0.05, metalness: 0.1, emissive: '#3a78a8', emissiveIntensity: 0.25 }));
    glass.position.set(x, 1.3, d / 2 + 0.075);
    const cross = teil(new THREE.BoxGeometry(0.05, 0.56, 0.02), '#ffffff', 0); cross.position.set(x, 1.3, d / 2 + 0.08);
    const box = teil(new THREE.BoxGeometry(0.9, 0.18, 0.22), '#a8683d', 0.02); box.position.set(x, 0.86, d / 2 + 0.12);
    g.add(frame, glass, cross, box);
    for (let k = 0; k < 4; k++) {
      const f = teil(new THREE.SphereGeometry(0.09, 10, 8), ['#ff4f6d', '#ffd23a', '#ff8fd0', '#ff7a2f'][k], 0.012);
      f.position.set(x - 0.3 + k * 0.2, 1.0, d / 2 + 0.14); g.add(f);
    }
  }
  // Seitenfenster
  const sw = teil(new THREE.BoxGeometry(0.08, 0.6, 0.7), '#ffffff', 0.02); sw.position.set(w / 2 + 0.03, 1.3, 0);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.45).rotateY(Math.PI / 2), smooth('#9fdcff', { roughness: 0.05, emissive: '#3a78a8', emissiveIntensity: 0.25 }));
  sg.position.set(w / 2 + 0.075, 1.3, 0);
  g.add(sw, sg);
  return g;
}

function baum(h = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = teil(new THREE.CylinderGeometry(0.14 * h, 0.2 * h, 1.3 * h, 10), '#8a5a33'); trunk.position.y = 0.65 * h;
  g.add(trunk);
  const greens = ['#3faa3a', '#4fbf45', '#36993a'];
  [[0, 1.75, 0, 0.85], [-0.45, 1.45, 0.15, 0.6], [0.45, 1.5, -0.1, 0.62], [0.05, 2.25, 0, 0.55]].forEach(([x, y, z, r], k) => {
    const c = teil(new THREE.SphereGeometry(r * h, 20, 14), greens[k % 3], 0.03); c.position.set(x * h, y * h, z * h); g.add(c);
  });
  return g;
}

function zaun(len: number): THREE.Group {
  const g = new THREE.Group();
  const n = Math.round(len / 0.5);
  for (let i = 0; i <= n; i++) { const p = teil(new THREE.BoxGeometry(0.12, 0.7, 0.08), '#fff7e8', 0.015); p.position.set(i * 0.5 - len / 2, 0.35, 0); g.add(p); }
  for (const y of [0.25, 0.5]) { const r = teil(new THREE.BoxGeometry(len, 0.08, 0.06), '#fff7e8', 0.015); r.position.set(0, y, -0.02); g.add(r); }
  return g;
}

function laterne(): THREE.Group {
  const g = new THREE.Group();
  const pole = teil(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 10), '#2a2f45'); pole.position.y = 1.1;
  const lamp = teil(new THREE.SphereGeometry(0.18, 14, 10), smooth('#fff3c4', { emissive: '#ffd27a', emissiveIntensity: 0.9 }), 0.02); lamp.position.y = 2.3;
  g.add(pole, lamp); return g;
}

function bank(): THREE.Group {
  const g = new THREE.Group();
  const seat = teil(new THREE.BoxGeometry(1.4, 0.08, 0.4), '#c07a43', 0.015); seat.position.y = 0.42;
  const back = teil(new THREE.BoxGeometry(1.4, 0.35, 0.06), '#c07a43', 0.015); back.position.set(0, 0.68, -0.18);
  g.add(seat, back);
  for (const x of [-0.6, 0.6]) { const l = teil(new THREE.BoxGeometry(0.08, 0.42, 0.36), '#2a2f45', 0.012); l.position.set(x, 0.21, 0); g.add(l); }
  return g;
}

export interface Diorama { group: THREE.Group; update(t: number, camDist: number): void; radius: number }

/** Baut die Umgebung. "hof" = Haus von Mensch Nr. 1, "dorf" = Dorfplatz mit Brunnen. */
export function createDiorama(art: 'hof' | 'dorf'): Diorama {
  seed = art === 'hof' ? 11 : 23;
  const g = new THREE.Group();
  const R = 60;
  // Boden: Wiese mit Struktur, Rand verschwindet im Dunst (Nebel)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 96).rotateX(-Math.PI / 2), smooth('#ffffff', { map: grasTex(), roughness: 0.95 }));
  ground.receiveShadow = true;
  g.add(ground);
  // Himmelskuppel mit Verlauf
  const sky = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uOpacity; varying vec3 vP;
      void main(){ float h = clamp(vP.y, 0.0, 1.0);
        vec3 top = pow(vec3(0.33,0.62,1.0), vec3(2.2)), hor = pow(vec3(0.86,0.94,1.0), vec3(2.2));
        vec3 c = mix(hor, top, smoothstep(0.0, 0.55, h));
        gl_FragColor = vec4(c, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1;
  g.add(sky);
  // Wolken am Himmel
  for (let i = 0; i < 9; i++) {
    const wolke = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(2 + rnd() * 1.5, 16, 12), smooth('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35 }));
      p.position.set(k * 2.4 - 3.6, rnd() * 0.8, rnd() * 1.2); p.scale.y = 0.6; wolke.add(p);
    }
    const a = (i / 9) * Math.PI * 2;
    wolke.position.set(Math.cos(a) * 42, 16 + rnd() * 8, Math.sin(a) * 42);
    g.add(wolke);
  }
  const deko = new THREE.Group();
  g.add(deko);
  const wegMat = smooth('#ffffff', { map: wegTex(), roughness: 0.9 });
  let wasser: THREE.Mesh | null = null;
  if (art === 'hof') {
    const h = haus('#fff1d6', '#e8553f'); h.position.set(-0.4, 0, -4.4); h.rotation.y = 0.05; deko.add(h);
    const weg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 7).rotateX(-Math.PI / 2), wegMat); weg.position.set(-1.0, 0.01, 0.3); weg.receiveShadow = true; deko.add(weg);
    const z1 = zaun(9); z1.position.set(1.5, 0, -6.4); deko.add(z1);
    const z2 = zaun(9); z2.position.set(6, 0, 0.1); z2.rotation.y = Math.PI / 2; deko.add(z2);
    for (const [x, z, s] of [[4.2, -3.6, 1.2], [-7, -1, 1], [7.5, -6, 1.4], [-6.5, -7, 1.3], [9, 4, 1.1]]) { const b = baum(s); b.position.set(x, 0, z); deko.add(b); }
    // Wasserfass + Brunnen-Eimer
    const fass = teil(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 20), '#2f9bff'); fass.position.set(2.3, 0.45, -1.8); deko.add(fass);
    wasser = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24).rotateX(-Math.PI / 2), smooth('#7fdcff', { roughness: 0.05, emissive: '#2a8bd8', emissiveIntensity: 0.3 }));
    wasser.position.set(2.3, 0.91, -1.8); deko.add(wasser);
    const bk = bank(); bk.position.set(3.2, 0, -1.2); bk.rotation.y = -0.6; deko.add(bk);
    const l = laterne(); l.position.set(-4.6, 0, -0.6); deko.add(l);
  } else {
    // Dorfplatz mit Brunnen
    const platz = new THREE.Mesh(new THREE.CircleGeometry(6.5, 64).rotateX(-Math.PI / 2), wegMat); platz.position.y = 0.01; platz.receiveShadow = true; deko.add(platz);
    const becken = teil(new THREE.CylinderGeometry(1.7, 1.85, 0.6, 32), '#d7deeb'); becken.position.y = 0.3; deko.add(becken);
    wasser = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40).rotateX(-Math.PI / 2), smooth('#4cc3ff', { roughness: 0.05, emissive: '#1a6fb8', emissiveIntensity: 0.3 }));
    wasser.position.y = 0.55; deko.add(wasser);
    const saeule = teil(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 16), '#d7deeb'); saeule.position.y = 1.1; deko.add(saeule);
    const schale = teil(new THREE.CylinderGeometry(0.7, 0.35, 0.25, 24), '#d7deeb'); schale.position.y = 1.9; deko.add(schale);
    const farben: [string, string][] = [['#fff1d6', '#e8553f'], ['#e6f3ff', '#3f6dff'], ['#fff6c8', '#ff9a2f'], ['#ffe3ec', '#c84aa0'], ['#e9ffe3', '#2aa36b'], ['#fff1d6', '#8a4ad8'], ['#f0ecff', '#e8553f']];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2, r = 10.5 + (i % 2) * 1.5;
      const h = haus(farben[i][0], farben[i][1], 2 + (i % 3) * 0.5);
      h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); h.lookAt(0, 0, 0); deko.add(h);
      const b = baum(1 + (i % 3) * 0.2); b.position.set(Math.cos(a + 0.42) * 12.5, 0, Math.sin(a + 0.42) * 12.5); deko.add(b);
      const lt = laterne(); lt.position.set(Math.cos(a + 0.22) * 7.2, 0, Math.sin(a + 0.22) * 7.2); deko.add(lt);
    }
    for (let i = 0; i < 4; i++) { const bk = bank(); const a = (i / 4) * Math.PI * 2 + 0.6; bk.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2); bk.lookAt(0, 0, 0); deko.add(bk); }
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = 18 + rnd() * 20; const b = baum(1 + rnd() * 0.6); b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); deko.add(b); }
  }
  // Büsche und Steine verteilt
  const busch = mergeGeometries([new THREE.SphereGeometry(0.45, 14, 10), new THREE.SphereGeometry(0.35, 12, 8).translate(0.4, -0.05, 0.1), new THREE.SphereGeometry(0.32, 12, 8).translate(-0.35, -0.08, -0.1)])!;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = (art === 'hof' ? 5 : 14) + rnd() * 25;
    const b = teil(busch, ['#3faa3a', '#58c24a', '#2f8f3a'][i % 3], 0.03); b.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r); deko.add(b);
  }
  return {
    group: g, radius: R,
    update(t: number, camDist: number) {
      if (wasser) { wasser.position.y += Math.sin(t * 2.2) * 0.0008; (wasser.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.28 + Math.sin(t * 3) * 0.06; }
      // Himmel nur nahe der Umgebung zeigen (beim Heranfliegen weich einblenden)
      const o = THREE.MathUtils.smoothstep(camDist, R * 2.6, R * 1.15);
      (sky.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - o;
      sky.visible = o < 0.999;
    },
  };
}
