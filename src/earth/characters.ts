/**
 * CHARAKTER-BIBLIOTHEK – ein einheitlicher Stil für ALLE Figuren des Projekts.
 *
 * Stil (verbindlich): große runde Köpfe, kleine Körper, große einfache Cartoon-Gesichter,
 * kräftige schwarze Konturen, klare Farben, glatte Materialien.
 *
 * - Crowd: tausende Figuren gleichzeitig (Instancing = eine Figur, vielfach kopiert -> schnell).
 * - createCharacter: einzelne Figur (z. B. Moderator) aus GENAU denselben Bauteilen.
 * Maße in "Figurenhöhen": Füße bei y = 0, Scheitel bei ca. y = 1.3.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ Proportionen
export const P = {
  headY: 0.9, headR: 0.36,
  bodyY: 0.45,
  shoulder: new THREE.Vector3(0.235, 0.6, 0),
  hip: new THREE.Vector3(0.1, 0.27, 0),
};

/** Aussehen einer Figur. */
export interface Look {
  skin: string; hair: string; hairStyle: number; shirt: string; pants: string; shoes: string;
}

/** Haltung (Winkel in Radiant). */
export interface Pose {
  legL: number; legR: number;   // Beine vor/zurück
  armL: number; armR: number;   // Arme vor/zurück (Pendeln)
  liftL: number; liftR: number; // Arm seitlich/hoch heben (0 = hängt, 1 = ganz oben)
  drink: number;                // 0..1: rechter Arm führt Becher zum Mund
  headTilt: number;             // Kopf nach hinten neigen
  bodyLean: number;             // Oberkörper neigen
}
export const RUHE: Pose = { legL: 0, legR: 0, armL: 0, armR: 0, liftL: 0, liftR: 0, drink: 0, headTilt: 0, bodyLean: 0 };

export const PALETTE = {
  skins: ['#ffd9bd', '#f6c39f', '#e2a57a', '#c4855a', '#9a603c', '#6f4128'],
  hair: ['#2b1a12', '#5a3420', '#9b5a2a', '#e8b84a', '#1b1b24', '#d9472e', '#7a4cc2'],
  shirts: ['#ff4f6d', '#ffb238', '#2fa8ff', '#5bd14a', '#a66bff', '#ff7a2f', '#20c9a6', '#ffd23a', '#ff5fc1', '#3f6dff'],
  pants: ['#2f3b66', '#3a3f4a', '#4a6fd1', '#6b4a2f', '#2a6b55'],
};

// ------------------------------------------------------------------ Bauteile (Geometrie)
const sph = (r: number, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h);
const caps = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 14);

export interface PartGeos {
  head: THREE.BufferGeometry; face: THREE.BufferGeometry; whites: THREE.BufferGeometry; cheeks: THREE.BufferGeometry;
  mouth: THREE.BufferGeometry; hair: THREE.BufferGeometry[]; body: THREE.BufferGeometry;
  armL: THREE.BufferGeometry; armR: THREE.BufferGeometry; handL: THREE.BufferGeometry; handR: THREE.BufferGeometry;
  legL: THREE.BufferGeometry; legR: THREE.BufferGeometry; shoeL: THREE.BufferGeometry; shoeR: THREE.BufferGeometry;
  cup: THREE.BufferGeometry; water: THREE.BufferGeometry;
}

let cache: PartGeos | null = null;
/** Alle Bauteile – einmal erzeugt, von allen Figuren geteilt. */
export function partGeos(): PartGeos {
  if (cache) return cache;
  const H = P.headY, R = P.headR;
  const head = mergeGeometries([
    sph(R, 32, 24).scale(1.06, 0.97, 1).translate(0, H, 0),
    sph(0.035, 12, 10).translate(0, H - 0.03, R * 0.98),                       // Nase
    sph(0.07, 14, 10).scale(0.6, 1, 0.8).translate(-R * 1.03, H, 0),            // Ohren
    sph(0.07, 14, 10).scale(0.6, 1, 0.8).translate(R * 1.03, H, 0),
  ])!;
  // Gesicht: große ovale Augen + Augenbrauen (schwarz)
  const eye = (x: number) => sph(0.062, 20, 16).scale(0.85, 1.15, 0.5).translate(x, H + 0.04, R * 0.9);
  const brow = (x: number, rot: number) => new THREE.CapsuleGeometry(0.014, 0.06, 4, 8).rotateZ(Math.PI / 2 + rot).translate(x, H + 0.15, R * 0.86);
  const face = mergeGeometries([eye(-0.12), eye(0.12), brow(-0.12, 0.15), brow(0.12, -0.15)])!;
  const whites = mergeGeometries([
    sph(0.02, 10, 8).translate(-0.135, H + 0.075, R * 0.95), sph(0.02, 10, 8).translate(0.105, H + 0.075, R * 0.95),
    sph(0.01, 8, 6).translate(-0.105, H + 0.02, R * 0.96), sph(0.01, 8, 6).translate(0.135, H + 0.02, R * 0.96),
  ])!;
  const cheeks = mergeGeometries([
    new THREE.CircleGeometry(0.05, 20).translate(0, 0, 0).rotateY(-0.5).translate(-0.21, H - 0.06, R * 0.82),
    new THREE.CircleGeometry(0.05, 20).rotateY(0.5).translate(0.21, H - 0.06, R * 0.82),
  ])!;
  // Lächeln (wird für "Sprechen" in y skaliert)
  const mouth = new THREE.TorusGeometry(0.062, 0.017, 8, 20, Math.PI).rotateZ(Math.PI).translate(0, H - 0.08, R * 0.93);
  // Frisuren
  const capHair = (r: number) => new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const hair = [
    // 0: kurze Haare mit Stirnfransen
    mergeGeometries([capHair(R * 1.07).rotateX(-0.35).translate(0, H + 0.02, -0.02),
      sph(0.09, 14, 10).scale(1.4, 0.6, 0.7).translate(-0.08, H + 0.24, R * 0.78), sph(0.09, 14, 10).scale(1.4, 0.6, 0.7).translate(0.09, H + 0.25, R * 0.76)])!,
    // 1: Bob (seitlich länger)
    mergeGeometries([capHair(R * 1.09).rotateX(-0.25).translate(0, H + 0.02, -0.02),
      sph(0.14, 16, 12).scale(0.7, 1.5, 1).translate(-R * 0.98, H - 0.04, -0.03), sph(0.14, 16, 12).scale(0.7, 1.5, 1).translate(R * 0.98, H - 0.04, -0.03)])!,
    // 2: Dutt
    mergeGeometries([capHair(R * 1.07).rotateX(-0.3).translate(0, H + 0.02, -0.02), sph(0.14, 18, 14).translate(0, H + R + 0.07, -0.08)])!,
    // 3: Strubbel-Locken
    mergeGeometries([capHair(R * 1.06).rotateX(-0.3).translate(0, H + 0.02, -0.02),
      ...[-0.18, -0.06, 0.06, 0.18].map((x, k) => sph(0.1, 14, 10).translate(x, H + 0.3 - Math.abs(x) * 0.5, 0.05 - k * 0.02))])!,
  ];
  const body = mergeGeometries([caps(0.2, 0.14).scale(1.05, 1, 0.92).translate(0, P.bodyY, 0)])!;
  const S = P.shoulder, Hp = P.hip;
  const arm = (side: number) => caps(0.062, 0.17).translate(side * S.x, S.y - 0.13, 0);
  const hand = (side: number) => sph(0.072, 16, 12).translate(side * S.x, S.y - 0.27, 0);
  const leg = (side: number) => caps(0.082, 0.1).translate(side * Hp.x, Hp.y - 0.12, 0);
  const shoe = (side: number) => sph(0.1, 16, 12).scale(1, 0.62, 1.35).translate(side * Hp.x, Hp.y - 0.235, 0.035);
  const cup = new THREE.CylinderGeometry(0.06, 0.048, 0.13, 16).translate(S.x + 0.02, S.y - 0.3, 0.07);
  const water = new THREE.CylinderGeometry(0.052, 0.052, 0.012, 16).translate(S.x + 0.02, S.y - 0.24, 0.07);
  cache = { head, face, whites, cheeks, mouth, hair, body, armL: arm(-1), armR: arm(1), handL: hand(-1), handR: hand(1),
    legL: leg(-1), legR: leg(1), shoeL: shoe(-1), shoeR: shoe(1), cup, water };
  return cache;
}

// ------------------------------------------------------------------ Materialien
const matCache = new Map<string, THREE.Material>();
export function smooth(color = '#ffffff', extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0, ...extra });
}
/** Kräftige schwarze Kontur: Rückseite der Form, entlang der Normalen aufgeblasen. */
export function outlineMaterial(dicke = 0.022): THREE.MeshBasicMaterial {
  const key = 'ol' + dicke;
  if (matCache.has(key)) return matCache.get(key) as THREE.MeshBasicMaterial;
  const m = new THREE.MeshBasicMaterial({ color: '#111322', side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normal * ${dicke.toFixed(4)};`);
  };
  matCache.set(key, m);
  return m;
}

// ------------------------------------------------------------------ Gelenke
type Attach = 'body' | 'head' | 'armL' | 'armR' | 'legL' | 'legR';
const tmpM = new THREE.Matrix4(), tmpR = new THREE.Matrix4(), tmpT = new THREE.Matrix4();

/** Matrix eines Gelenks relativ zur Figur: um den Drehpunkt rotieren. */
function jointMatrix(out: THREE.Matrix4, pivot: THREE.Vector3, rx: number, rz: number): THREE.Matrix4 {
  tmpR.makeRotationFromEuler(new THREE.Euler(rx, 0, rz));
  out.makeTranslation(pivot.x, pivot.y, pivot.z).multiply(tmpR);
  return out.multiply(tmpT.makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

const NECK = new THREE.Vector3(0, 0.62, 0);
const WAIST = new THREE.Vector3(0, 0.3, 0);

/** Gelenk-Matrizen für eine Haltung (relativ zur Figur). */
export function poseMatrices(p: Pose): Record<Attach, THREE.Matrix4> {
  const body = jointMatrix(new THREE.Matrix4(), WAIST, p.bodyLean, 0);
  const head = body.clone().multiply(jointMatrix(tmpM, NECK, -p.headTilt, 0));
  const S = P.shoulder;
  // rechter Arm: Pendeln + Heben + Trinken (Becher zum Mund)
  const rRx = p.armR - p.drink * 2.3;
  const rRz = p.liftR * 2.6 + p.drink * 0.35;
  const armR = body.clone().multiply(jointMatrix(tmpM, new THREE.Vector3(S.x, S.y, 0), rRx, rRz));
  const armL = body.clone().multiply(jointMatrix(tmpM, new THREE.Vector3(-S.x, S.y, 0), p.armL, -p.liftL * 2.6));
  const legL = jointMatrix(new THREE.Matrix4(), new THREE.Vector3(-P.hip.x, P.hip.y, 0), p.legL, 0);
  const legR = jointMatrix(new THREE.Matrix4(), new THREE.Vector3(P.hip.x, P.hip.y, 0), p.legR, 0);
  return { body, head, armL, armR, legL, legR };
}

// ------------------------------------------------------------------ Teileliste (für Crowd und Einzelfigur gleich)
interface PartDef { geo: keyof PartGeos | ['hair', number]; attach: Attach; color: (l: Look) => string | null; mat: 'color' | 'black' | 'white' | 'pink' | 'cup' | 'water'; outline: number }
const PARTS: PartDef[] = [
  { geo: 'legL', attach: 'legL', color: (l) => l.pants, mat: 'color', outline: 0.02 },
  { geo: 'legR', attach: 'legR', color: (l) => l.pants, mat: 'color', outline: 0.02 },
  { geo: 'shoeL', attach: 'legL', color: (l) => l.shoes, mat: 'color', outline: 0.02 },
  { geo: 'shoeR', attach: 'legR', color: (l) => l.shoes, mat: 'color', outline: 0.02 },
  { geo: 'body', attach: 'body', color: (l) => l.shirt, mat: 'color', outline: 0.024 },
  { geo: 'armL', attach: 'armL', color: (l) => l.shirt, mat: 'color', outline: 0.02 },
  { geo: 'armR', attach: 'armR', color: (l) => l.shirt, mat: 'color', outline: 0.02 },
  { geo: 'handL', attach: 'armL', color: (l) => l.skin, mat: 'color', outline: 0.018 },
  { geo: 'handR', attach: 'armR', color: (l) => l.skin, mat: 'color', outline: 0.018 },
  { geo: 'cup', attach: 'armR', color: () => '#e9f8ff', mat: 'cup', outline: 0.016 },
  { geo: 'water', attach: 'armR', color: () => null, mat: 'water', outline: 0 },
  { geo: 'head', attach: 'head', color: (l) => l.skin, mat: 'color', outline: 0.028 },
  ...[0, 1, 2, 3].map((k): PartDef => ({ geo: ['hair', k], attach: 'head', color: (l) => (l.hairStyle === k ? l.hair : null), mat: 'color', outline: 0.024 })),
  { geo: 'face', attach: 'head', color: () => null, mat: 'black', outline: 0 },
  { geo: 'whites', attach: 'head', color: () => null, mat: 'white', outline: 0 },
  { geo: 'cheeks', attach: 'head', color: () => null, mat: 'pink', outline: 0 },
  { geo: 'mouth', attach: 'head', color: () => null, mat: 'black', outline: 0 },
];

function partMaterial(kind: PartDef['mat']): THREE.Material {
  switch (kind) {
    case 'black': return new THREE.MeshBasicMaterial({ color: '#141420' });
    case 'white': return new THREE.MeshBasicMaterial({ color: '#ffffff' });
    case 'pink': return new THREE.MeshBasicMaterial({ color: '#ff8fa8', transparent: true, opacity: 0.75, depthWrite: false });
    case 'cup': return smooth('#e9f8ff', { roughness: 0.15 });
    case 'water': return smooth('#36b6ff', { roughness: 0.05, emissive: '#0a4a8a', emissiveIntensity: 0.35 });
    default: return smooth();
  }
}
const geoOf = (g: PartDef['geo']) => (Array.isArray(g) ? partGeos().hair[g[1]] : partGeos()[g]) as THREE.BufferGeometry;

// ------------------------------------------------------------------ Viele Figuren (Instancing)
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class Crowd {
  readonly group = new THREE.Group();
  private meshes: { def: PartDef; mesh: THREE.InstancedMesh; outline?: THREE.InstancedMesh }[] = [];
  private looks: Look[] = [];
  count = 0;
  readonly max: number;

  constructor(max: number) {
    this.max = max;
    for (const def of PARTS) {
      const geo = geoOf(def.geo);
      const mesh = new THREE.InstancedMesh(geo, partMaterial(def.mat), max);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = def.mat === 'color';
      this.group.add(mesh);
      let outline: THREE.InstancedMesh | undefined;
      if (def.outline > 0) {
        outline = new THREE.InstancedMesh(geo, outlineMaterial(def.outline), max);
        outline.frustumCulled = false;
        outline.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(outline);
      }
      this.meshes.push({ def, mesh, outline });
    }
  }

  setLook(i: number, look: Look): void {
    this.looks[i] = look;
    const c = new THREE.Color();
    for (const { def, mesh } of this.meshes) {
      const col = def.color(look);
      if (def.mat === 'color' && col) mesh.setColorAt(i, c.set(col));
    }
    for (const { mesh } of this.meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Setzt Position/Ausrichtung/Größe (base) und Haltung einer Figur. */
  setPose(i: number, base: THREE.Matrix4, pose: Pose): void {
    const j = poseMatrices(pose);
    const look = this.looks[i];
    const m = new THREE.Matrix4();
    for (const { def, mesh, outline } of this.meshes) {
      const hidden = look && def.mat === 'color' && def.color(look) === null;
      if (hidden) { mesh.setMatrixAt(i, ZERO); outline?.setMatrixAt(i, ZERO); continue; }
      m.multiplyMatrices(base, j[def.attach]);
      mesh.setMatrixAt(i, m);
      outline?.setMatrixAt(i, m);
    }
  }

  setCount(n: number): void {
    this.count = n;
    for (const { mesh, outline } of this.meshes) { mesh.count = n; if (outline) outline.count = n; }
  }

  commit(): void {
    for (const { mesh, outline } of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (outline) outline.instanceMatrix.needsUpdate = true;
    }
  }
}

// ------------------------------------------------------------------ Einzelfigur (gleicher Stil)
export interface Character {
  root: THREE.Group;
  /** Gelenkgruppen, an die man Zubehör hängen kann (z. B. Mütze an 'head'). */
  joints: Record<Attach, THREE.Group>;
  mouth: THREE.Mesh;
  setPose(p: Pose): void;
}

export function createCharacter(look: Look, opts: { becher?: boolean } = {}): Character {
  const root = new THREE.Group();
  const joints = {} as Record<Attach, THREE.Group>;
  for (const a of ['body', 'head', 'armL', 'armR', 'legL', 'legR'] as Attach[]) { joints[a] = new THREE.Group(); joints[a].matrixAutoUpdate = false; root.add(joints[a]); }
  let mouth!: THREE.Mesh;
  for (const def of PARTS) {
    if ((def.geo === 'cup' || def.geo === 'water') && opts.becher === false) continue;
    const col = def.color(look);
    if (def.mat === 'color' && col === null) continue;
    const mat = partMaterial(def.mat);
    if (col && mat instanceof THREE.MeshStandardMaterial) mat.color.set(col);
    const mesh = new THREE.Mesh(geoOf(def.geo), mat);
    mesh.castShadow = def.mat === 'color';
    if (def.outline > 0) mesh.add(new THREE.Mesh(geoOf(def.geo), outlineMaterial(def.outline)));
    if (def.geo === 'mouth') mouth = mesh;
    joints[def.attach].add(mesh);
  }
  const setPose = (p: Pose) => {
    const j = poseMatrices(p);
    for (const a of Object.keys(joints) as Attach[]) { joints[a].matrix.copy(j[a]); joints[a].matrixWorldNeedsUpdate = true; }
  };
  setPose(RUHE);
  return { root, joints, mouth, setPose };
}

/** Zufälliges, aber festes Aussehen für Einwohner Nr. i. */
export function lookFor(i: number, rnd: (k: number) => number): Look {
  const pick = <T>(a: T[], k: number) => a[Math.floor(rnd(k) * a.length) % a.length];
  return {
    skin: pick(PALETTE.skins, i * 13 + 1), hair: pick(PALETTE.hair, i * 13 + 2), hairStyle: Math.floor(rnd(i * 13 + 3) * 4) % 4,
    shirt: pick(PALETTE.shirts, i * 13 + 4), pants: pick(PALETTE.pants, i * 13 + 5), shoes: rnd(i * 13 + 6) < 0.5 ? '#ffffff' : '#2a2a36',
  };
}

// ------------------------------------------------------------------ Fernsicht (sehr viele, sehr kleine Figuren)
/**
 * Vereinfachte Figuren für die Fernsicht (nur wenige Pixel groß): gleiche Proportionen und Farben,
 * aber ohne Gesichtsdetails und Konturen -> tausende Figuren bleiben flüssig.
 */
export class FarCrowd {
  readonly group = new THREE.Group();
  private head: THREE.InstancedMesh;
  private body: THREE.InstancedMesh;
  constructor(max: number) {
    const H = P.headY, R = P.headR;
    this.head = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 10, 8).scale(1.06, 0.97, 1).translate(0, H, 0), smooth(), max);
    const body = mergeGeometries([new THREE.CapsuleGeometry(0.2, 0.14, 3, 8).translate(0, P.bodyY, 0), new THREE.CylinderGeometry(0.17, 0.15, 0.27, 8).translate(0, 0.14, 0)])!;
    this.body = new THREE.InstancedMesh(body, smooth(), max);
    for (const m of [this.head, this.body]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; this.group.add(m); }
  }
  setLook(i: number, look: Look): void {
    const c = new THREE.Color();
    this.head.setColorAt(i, c.set(look.skin));
    this.body.setColorAt(i, c.set(look.shirt));
  }
  setPose(i: number, base: THREE.Matrix4): void { this.head.setMatrixAt(i, base); this.body.setMatrixAt(i, base); }
  setCount(n: number): void { this.head.count = this.body.count = n; }
  commit(): void {
    for (const m of [this.head, this.body]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}
