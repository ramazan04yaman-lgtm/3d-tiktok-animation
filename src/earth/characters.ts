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
/**
 * Bauplan = der originale Kapitän Durst (Referenzbild), in halber Größe (Faktor S).
 * Alle Figuren nutzen exakt diese Proportionen.
 */
const S = 0.5;
export const P = {
  headY: 1.85 * S, headR: 0.55 * S,
  bodyY: 0.95 * S,
  shoulder: new THREE.Vector3(0.42 * S, 1.25 * S, 0),
  hip: new THREE.Vector3(0.17 * S, 0.6 * S, 0),
};

/** Aussehen einer Figur. hairStyle = Kopfbedeckung: 0 Glatze, 1 Basecap, 2 Mütze mit Bommel, 3 Haarschopf, 4 Strohhut. */
export interface Look {
  skin: string; hair: string; hairStyle: number; shirt: string; pants: string; shoes: string; tie?: string;
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
  skins: ['#ffe0c4', '#f6c9a5', '#e2a57a', '#c4855a', '#9a603c', '#6f4128'],
  hair: ['#ff4f5e', '#2fa8ff', '#ffd23a', '#5bd14a', '#a66bff', '#ff7a2f', '#2b1a12', '#e8b84a'],
  shirts: ['#2f6be0', '#ff4f6d', '#ffb238', '#20c9a6', '#5bd14a', '#a66bff', '#ff7a2f', '#3f6dff', '#ff5fc1', '#2fa8ff'],
  pants: ['#1b2340', '#2f3b66', '#3a3f4a', '#4a3a2a', '#2a4a5a'],
};

// ------------------------------------------------------------------ Bauteile (Geometrie)
const sph = (r: number, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h);
const caps = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 14);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
/** Geometrie im Original-Maßstab bauen und dann auf Figurengröße verkleinern. */
const fertig = (g: THREE.BufferGeometry) => g.scale(S, S, S);

export interface PartGeos {
  head: THREE.BufferGeometry; face: THREE.BufferGeometry; whites: THREE.BufferGeometry; cheeks: THREE.BufferGeometry;
  mouth: THREE.BufferGeometry; hair: THREE.BufferGeometry[]; body: THREE.BufferGeometry; collar: THREE.BufferGeometry; tie: THREE.BufferGeometry;
  armL: THREE.BufferGeometry; armR: THREE.BufferGeometry; handL: THREE.BufferGeometry; handR: THREE.BufferGeometry;
  legL: THREE.BufferGeometry; legR: THREE.BufferGeometry; shoeL: THREE.BufferGeometry; shoeR: THREE.BufferGeometry;
  cup: THREE.BufferGeometry; water: THREE.BufferGeometry;
}

let cache: PartGeos | null = null;
/** Alle Bauteile – einmal erzeugt, von allen Figuren geteilt (Maße wie der originale Kapitän). */
export function partGeos(): PartGeos {
  if (cache) return cache;
  const HY = 1.85;
  // Kopf: große, leicht gestauchte Kugel + Ohren
  const head = fertig(mergeGeometries([
    at(sph(0.55, 36, 26).scale(1, 0.95, 0.92), 0, HY, 0),
    at(sph(0.11, 14, 10), -0.55, HY - 0.02, 0), at(sph(0.11, 14, 10), 0.55, HY - 0.02, 0),
  ])!);
  // Sonnenbrille (schwarz): zwei große eckige Gläser + Steg
  const lens = (x: number) => at(new THREE.BoxGeometry(0.32, 0.2, 0.06, 2, 2, 1).rotateY(x * 0.4), x, HY + 0.06, 0.48);
  const face = fertig(mergeGeometries([lens(-0.2), lens(0.2), at(new THREE.BoxGeometry(0.12, 0.04, 0.04), 0, HY + 0.1, 0.52)])!);
  // weiße Glanzpunkte auf der Brille
  const shine = (x: number) => at(new THREE.PlaneGeometry(0.08, 0.04).rotateY(x * 0.4), x - 0.07, HY + 0.1, 0.515);
  const whites = fertig(mergeGeometries([shine(-0.2), shine(0.2)])!);
  const cheeks = fertig(mergeGeometries([
    at(new THREE.CircleGeometry(0.075, 20).rotateY(-0.33), -0.3, HY - 0.12, 0.47),
    at(new THREE.CircleGeometry(0.075, 20).rotateY(0.33), 0.3, HY - 0.12, 0.47),
  ])!);
  const mouth = fertig(at(sph(0.1, 20, 12).scale(1.3, 0.35, 0.35), 0, HY - 0.26, 0.47));
  // Kopfbedeckungen (Index = Look.hairStyle; 0 = Glatze wie der Kapitän)
  const kopf = (g: THREE.BufferGeometry) => fertig(at(g, 0, HY, 0));
  const hair = [
    new THREE.BufferGeometry(),
    kopf(mergeGeometries([new THREE.SphereGeometry(0.565, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42).rotateX(-0.25),
      new THREE.CylinderGeometry(0.42, 0.42, 0.035, 28, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.23, 0.32).rotateX(0.12)])!),
    kopf(mergeGeometries([new THREE.SphereGeometry(0.575, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4).rotateX(-0.2),
      new THREE.TorusGeometry(0.5, 0.06, 8, 32).rotateX(Math.PI / 2).translate(0, 0.27, -0.06), sph(0.13, 14, 10).translate(0, 0.62, -0.12)])!),
    kopf(mergeGeometries([sph(0.16, 14, 10).translate(-0.12, 0.5, 0.05), sph(0.18, 14, 10).translate(0.05, 0.56, 0), sph(0.14, 14, 10).translate(0.2, 0.48, -0.02)])!),
    kopf(mergeGeometries([new THREE.CylinderGeometry(0.4, 0.45, 0.28, 28).translate(0, 0.52, -0.02), new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32).translate(0, 0.4, 0)])!),
  ];
  const body = fertig(at(caps(0.36, 0.42), 0, 0.95, 0));
  const collar = fertig(at(new THREE.ConeGeometry(0.17, 0.3, 3).rotateX(Math.PI).scale(1, 1, 0.4), 0, 1.22, 0.3));
  const tie = fertig(at(new THREE.ConeGeometry(0.05, 0.22, 4).rotateX(Math.PI).scale(1, 1, 0.5), 0, 1.15, 0.36));
  const arm = (side: number) => fertig(at(caps(0.1, 0.42), 0.42 * side, 1.25 - 0.3, 0));
  const hand = (side: number) => fertig(at(sph(0.12, 14, 10), 0.42 * side, 1.25 - 0.6, 0));
  const leg = (side: number) => fertig(at(caps(0.12, 0.35), 0.17 * side, 0.32, 0));
  const shoe = (side: number) => fertig(at(sph(0.15, 16, 12).scale(1, 0.6, 1.5), 0.17 * side, 0.07, 0.06));
  const cup = fertig(at(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 18), 0.42, 1.25 - 0.66, 0.14));
  const water = fertig(at(new THREE.CylinderGeometry(0.115, 0.115, 0.02, 18), 0.42, 1.25 - 0.52, 0.14));
  cache = { head, face, whites, cheeks, mouth, hair, body, collar, tie, armL: arm(-1), armR: arm(1), handL: hand(-1), handR: hand(1),
    legL: leg(-1), legR: leg(1), shoeL: shoe(-1), shoeR: shoe(1), cup, water };
  return cache;
}

// ------------------------------------------------------------------ Materialien
const matCache = new Map<string, THREE.Material>();
/** Drei klare Helligkeitsstufen – der flache Cartoon-Look aus dem Referenzbild (Kapitän Durst). */
const STUFEN = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
/** Einheitliches Material für ALLE Figuren und Umgebungen: flache Cartoon-Schattierung (Toon). */
export function smooth(color = '#ffffff', extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshToonMaterial {
  const { roughness: _r, metalness: _m, ...rest } = extra;
  void _r; void _m;
  return new THREE.MeshToonMaterial({ color, gradientMap: STUFEN, ...(rest as THREE.MeshToonMaterialParameters) });
}
/** Kräftige schwarze Kontur: Rückseite der Form, entlang der Normalen aufgeblasen. */
export function outlineMaterial(dicke = 0.022): THREE.MeshBasicMaterial {
  dicke = Math.round(dicke * 0.8 * 10000) / 10000;   // klare, saubere Konturen (für alle Figuren gleich)
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

const NECK = new THREE.Vector3(0, 1.4 * S, 0);
const WAIST = new THREE.Vector3(0, 0.6 * S, 0);

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
interface PartDef { geo: keyof PartGeos | ['hair', number]; attach: Attach; color: (l: Look) => string | null; mat: 'color' | 'black' | 'white' | 'pink' | 'cup' | 'water' | 'mund'; outline: number }
const PARTS: PartDef[] = [
  { geo: 'legL', attach: 'legL', color: (l) => l.pants, mat: 'color', outline: 0.02 },
  { geo: 'legR', attach: 'legR', color: (l) => l.pants, mat: 'color', outline: 0.02 },
  { geo: 'shoeL', attach: 'legL', color: (l) => l.shoes, mat: 'color', outline: 0.02 },
  { geo: 'shoeR', attach: 'legR', color: (l) => l.shoes, mat: 'color', outline: 0.02 },
  { geo: 'body', attach: 'body', color: (l) => l.shirt, mat: 'color', outline: 0.024 },
  { geo: 'collar', attach: 'body', color: () => '#ffffff', mat: 'color', outline: 0.012 },
  { geo: 'tie', attach: 'body', color: (l) => l.tie ?? '#ff4f5e', mat: 'color', outline: 0.012 },
  { geo: 'armL', attach: 'armL', color: (l) => l.shirt, mat: 'color', outline: 0.02 },
  { geo: 'armR', attach: 'armR', color: (l) => l.shirt, mat: 'color', outline: 0.02 },
  { geo: 'handL', attach: 'armL', color: (l) => l.skin, mat: 'color', outline: 0.018 },
  { geo: 'handR', attach: 'armR', color: (l) => l.skin, mat: 'color', outline: 0.018 },
  { geo: 'cup', attach: 'armR', color: () => '#e9f8ff', mat: 'cup', outline: 0.016 },
  { geo: 'water', attach: 'armR', color: () => null, mat: 'water', outline: 0 },
  { geo: 'head', attach: 'head', color: (l) => l.skin, mat: 'color', outline: 0.028 },
  ...[1, 2, 3, 4].map((k): PartDef => ({ geo: ['hair', k], attach: 'head', color: (l) => (l.hairStyle === k ? l.hair : null), mat: 'color', outline: 0.024 })),
  { geo: 'face', attach: 'head', color: () => null, mat: 'black', outline: 0 },
  { geo: 'whites', attach: 'head', color: () => null, mat: 'white', outline: 0 },
  { geo: 'cheeks', attach: 'head', color: () => null, mat: 'pink', outline: 0 },
  { geo: 'mouth', attach: 'head', color: () => null, mat: 'mund', outline: 0 },
];

function partMaterial(kind: PartDef['mat']): THREE.Material {
  switch (kind) {
    case 'black': return new THREE.MeshBasicMaterial({ color: '#141420' });
    case 'white': return new THREE.MeshBasicMaterial({ color: '#ffffff' });
    case 'mund': return new THREE.MeshBasicMaterial({ color: '#7a1626' });
    case 'pink': return new THREE.MeshBasicMaterial({ color: '#ff8fa8', transparent: true, opacity: 0.75, depthWrite: false });
    case 'cup': return smooth('#e9f8ff', { roughness: 0.15 });
    case 'water': return smooth('#36b6ff', { roughness: 0.05, emissive: '#0a4a8a', emissiveIntensity: 0.35 });
    default: return smooth();
  }
}
const geoOf = (g: PartDef['geo'], geos: PartGeos = partGeos()) => (Array.isArray(g) ? geos.hair[g[1]] : geos[g]) as THREE.BufferGeometry;

// ------------------------------------------------------------------ WASSERTROPFEN-WESEN (Einwohner ab Tag 7)
/** Figurenstil der Einwohner: Menschen (bis Tag 6) oder Wassertropfen-Wesen. */
export type FigurStil = 'menschen' | 'tropfen';
/** Profil eines Tropfens (Original-Maßstab): runder Bauch, nach oben spitz. Höhe ≈ 2,3 wie eine Figur. */
const TR = { boden: 0.12, R: 0.74, spitze: 2.3 };
function tropfenRadius(y: number): number {
  const yc = TR.boden + TR.R;
  if (y <= yc) return Math.sqrt(Math.max(0, TR.R * TR.R - (y - yc) ** 2));
  const u = (y - yc) / (TR.spitze - yc);
  return TR.R * Math.pow(Math.max(0, 1 - u), 1.35) * (1 - 0.15 * u);
}
/** Wasserfarben der Tropfen (10 klar unterscheidbare Töne). */
export const TROPFEN_FARBEN = ['#4fc3ff', '#2f7dff', '#2fd3c8', '#7f9dff', '#62e4ff', '#1b62d6', '#46b0ea', '#36d3a0', '#a5dcff', '#5a6dff'];
const tropfenFarbe = (l: Look) => TROPFEN_FARBEN[Math.max(0, PALETTE.shirts.indexOf(l.shirt)) % TROPFEN_FARBEN.length];

let tropfenCache: PartGeos | null = null;
/** Bauteile des Tropfens – gleiche Gelenke wie die Menschen (Arme, Füße, Becher), damit alle Bewegungen passen. */
export function tropfenGeos(): PartGeos {
  if (tropfenCache) return tropfenCache;
  const prof: THREE.Vector2[] = [];
  for (let k = 0; k <= 40; k++) { const y = TR.boden + (TR.spitze - TR.boden) * (k / 40); prof.push(new THREE.Vector2(tropfenRadius(y), y)); }
  const koerper = fertig(new THREE.LatheGeometry(prof, 40));
  const vorn = (y: number) => tropfenRadius(y) * 0.93;
  const EY = 1.0;   // Augenhöhe
  // Große Cartoon-Augen: weiße Augäpfel, schwarze Pupillen, weiße Glanzpunkte
  const auge = (x: number) => at(sph(0.2, 24, 18).scale(0.85, 1.15, 0.45), x, EY, vorn(EY) - 0.05);
  const pupille = (x: number) => at(sph(0.1, 18, 12).scale(1, 1.2, 0.5), x * 1.05, EY - 0.03, vorn(EY) + 0.03);
  const glanz = (x: number) => at(sph(0.035, 10, 8), x * 1.05 + 0.04, EY + 0.04, vorn(EY) + 0.08);
  const augenWeiss = fertig(mergeGeometries([auge(-0.22), auge(0.22), glanz(-0.22), glanz(0.22)])!);
  const pupillen = fertig(mergeGeometries([pupille(-0.22), pupille(0.22)])!);
  const wangen = fertig(mergeGeometries([
    at(new THREE.CircleGeometry(0.085, 20).rotateY(-0.5), -0.45, EY - 0.27, vorn(EY - 0.27) * 0.92),
    at(new THREE.CircleGeometry(0.085, 20).rotateY(0.5), 0.45, EY - 0.27, vorn(EY - 0.27) * 0.92),
  ])!);
  const mund = fertig(at(sph(0.11, 20, 12).scale(1.3, 0.4, 0.35), 0, EY - 0.34, vorn(EY - 0.34) + 0.01));
  // Kleine Accessoires auf der Spitze (Index = Look.hairStyle; 0 = ohne)
  const top = TR.spitze;
  const deko = (g: THREE.BufferGeometry) => fertig(g);
  const hair = [
    new THREE.BufferGeometry(),
    deko(mergeGeometries([new THREE.SphereGeometry(0.24, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, top - 0.32, 0),
      new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18, 1, false, -Math.PI / 2, Math.PI).translate(0, top - 0.32, 0.17)])!),   // Kappe
    deko(sph(0.15, 16, 12).translate(0, top + 0.05, 0)),                                                                   // Bommel
    deko(new THREE.TorusGeometry(0.11, 0.035, 8, 20, Math.PI * 1.5).rotateZ(-0.6).translate(0.05, top + 0.06, 0)),          // Locke
    deko(mergeGeometries([new THREE.CylinderGeometry(0.17, 0.2, 0.16, 20).translate(0, top - 0.2, 0),
      new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24).translate(0, top - 0.28, 0)])!),                                   // Strohhut
  ];
  // Fliege vorn am Bauch
  const fliege = fertig(mergeGeometries([
    at(new THREE.ConeGeometry(0.1, 0.18, 4).rotateZ(Math.PI / 2), -0.09, 0.4, vorn(0.4) + 0.02),
    at(new THREE.ConeGeometry(0.1, 0.18, 4).rotateZ(-Math.PI / 2), 0.09, 0.4, vorn(0.4) + 0.02),
    at(sph(0.05, 10, 8), 0, 0.4, vorn(0.4) + 0.04)])!);
  // Arme: kurze Stummel vom Schultergelenk schräg nach außen-unten (drehen sich um dasselbe Gelenk wie bei den Menschen)
  const arm = (s: number) => fertig(at(caps(0.09, 0.42).rotateZ(s * 0.55), 0.58 * s, 0.98, 0));
  const hand = (s: number) => fertig(at(sph(0.12, 14, 10), 0.75 * s, 0.72, 0.02));
  const fuss = (s: number) => fertig(at(sph(0.16, 16, 12).scale(1, 0.55, 1.4), 0.26 * s, 0.07, 0.08));
  const leer = new THREE.BufferGeometry();
  const becher = fertig(at(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 18), 0.76, 0.66, 0.16));
  const wasser = fertig(at(new THREE.CylinderGeometry(0.105, 0.105, 0.02, 18), 0.76, 0.79, 0.16));
  tropfenCache = { head: leer, face: pupillen, whites: augenWeiss, cheeks: wangen, mouth: mund, hair, body: koerper, collar: leer, tie: fliege,
    armL: arm(-1), armR: arm(1), handL: hand(-1), handR: hand(1), legL: leer, legR: leer, shoeL: fuss(-1), shoeR: fuss(1), cup: becher, water: wasser };
  return tropfenCache;
}
/** Teileliste der Tropfen: Körper in Wasserfarbe, weiße Handschuhe und Füße, Fliege + Accessoire in den eigenen Farben. */
const TROPFEN_PARTS: PartDef[] = [
  { geo: 'shoeL', attach: 'legL', color: () => '#ffffff', mat: 'color', outline: 0.02 },
  { geo: 'shoeR', attach: 'legR', color: () => '#ffffff', mat: 'color', outline: 0.02 },
  { geo: 'body', attach: 'body', color: tropfenFarbe, mat: 'color', outline: 0.028 },
  { geo: 'tie', attach: 'body', color: (l) => l.tie ?? '#ff4f5e', mat: 'color', outline: 0.012 },
  { geo: 'armL', attach: 'armL', color: tropfenFarbe, mat: 'color', outline: 0.02 },
  { geo: 'armR', attach: 'armR', color: tropfenFarbe, mat: 'color', outline: 0.02 },
  { geo: 'handL', attach: 'armL', color: () => '#ffffff', mat: 'color', outline: 0.018 },
  { geo: 'handR', attach: 'armR', color: () => '#ffffff', mat: 'color', outline: 0.018 },
  { geo: 'cup', attach: 'armR', color: () => '#e9f8ff', mat: 'cup', outline: 0.016 },
  { geo: 'water', attach: 'armR', color: () => null, mat: 'water', outline: 0 },
  ...[1, 2, 3, 4].map((k): PartDef => ({ geo: ['hair', k], attach: 'body', color: (l) => (l.hairStyle === k ? l.hair : null), mat: 'color', outline: 0.02 })),
  { geo: 'whites', attach: 'body', color: () => null, mat: 'white', outline: 0 },
  { geo: 'face', attach: 'body', color: () => null, mat: 'black', outline: 0 },
  { geo: 'cheeks', attach: 'body', color: () => null, mat: 'pink', outline: 0 },
  { geo: 'mouth', attach: 'body', color: () => null, mat: 'mund', outline: 0 },
];

// ------------------------------------------------------------------ Viele Figuren (Instancing)
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class Crowd {
  readonly group = new THREE.Group();
  private meshes: { def: PartDef; mesh: THREE.InstancedMesh; outline?: THREE.InstancedMesh }[] = [];
  private looks: Look[] = [];
  count = 0;
  readonly max: number;

  readonly stil: FigurStil;
  constructor(max: number, stil: FigurStil = 'menschen') {
    this.max = max;
    this.stil = stil;
    const geos = stil === 'tropfen' ? tropfenGeos() : partGeos();
    for (const def of stil === 'tropfen' ? TROPFEN_PARTS : PARTS) {
      const geo = geoOf(def.geo, geos);
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
    if (col && mat instanceof THREE.MeshToonMaterial) mat.color.set(col);
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
    skin: pick(PALETTE.skins, i * 13 + 1), hair: pick(PALETTE.hair, i * 13 + 2), hairStyle: Math.floor(rnd(i * 13 + 3) * 5) % 5,
    shirt: pick(PALETTE.shirts, i * 13 + 4), pants: pick(PALETTE.pants, i * 13 + 5), shoes: '#ffffff', tie: pick(['#ff4f5e', '#ffd23a', '#2fa8ff', '#ffffff'], i * 13 + 7),
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
  private stil: FigurStil;
  constructor(max: number, stil: FigurStil = 'menschen') {
    this.stil = stil;
    const H = P.headY, R = P.headR;
    if (stil === 'tropfen') {
      // Fernsicht: einfacher Tropfen (Wasserfarbe) + zwei weiße Augen
      const prof: THREE.Vector2[] = [];
      for (let k = 0; k <= 12; k++) { const y = TR.boden + (TR.spitze - TR.boden) * (k / 12); prof.push(new THREE.Vector2(tropfenRadius(y) * S, y * S)); }
      this.head = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 12), smooth(), max);
      const augen = mergeGeometries([sph(0.2 * S, 8, 6).translate(-0.22 * S, 1.0 * S, 0.62 * S), sph(0.2 * S, 8, 6).translate(0.22 * S, 1.0 * S, 0.62 * S)])!;
      this.body = new THREE.InstancedMesh(augen, smooth(), max);
    } else {
      this.head = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 10, 8).scale(1.06, 0.97, 1).translate(0, H, 0), smooth(), max);
      const body = mergeGeometries([new THREE.CapsuleGeometry(0.18, 0.21, 3, 8).translate(0, P.bodyY, 0), new THREE.CylinderGeometry(0.13, 0.12, 0.3, 8).translate(0, 0.15, 0)])!;
      this.body = new THREE.InstancedMesh(body, smooth(), max);
    }
    for (const m of [this.head, this.body]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; this.group.add(m); }
  }
  setLook(i: number, look: Look): void {
    const c = new THREE.Color();
    this.head.setColorAt(i, c.set(this.stil === 'tropfen' ? tropfenFarbe(look) : look.skin));
    this.body.setColorAt(i, c.set(this.stil === 'tropfen' ? '#ffffff' : look.shirt));
  }
  setPose(i: number, base: THREE.Matrix4): void { this.head.setMatrixAt(i, base); this.body.setMatrixAt(i, base); }
  setCount(n: number): void { this.head.count = this.body.count = n; }
  commit(): void {
    for (const m of [this.head, this.body]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}
