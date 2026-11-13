/**
 * DIE MENSCHEN AUF DER ERDE
 * Jeder Follower = 1 Mensch. Die echte Zahl wird exakt gespeichert (BigInt).
 * Gezeichnet werden bis zu MAX_FIGURES kleine Cartoon-Figuren (Instancing:
 * eine Figur, tausendfach kopiert – sehr schnell). Bei mehr Menschen steht
 * eine Figur für mehrere Menschen.
 * Jeder Mensch bekommt fest (deterministisch) eine Heimatstadt – er "springt"
 * also zwischen zwei Videos nicht woanders hin.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type EarthAssets, sampleElevation } from './assets.ts';
import { RELIEF_EXAGGERATION } from './earthMaterial.ts';
import { EARTH_RADIUS_M, latLonToVec3, tangentFrame } from './geo.ts';

export const MAX_FIGURES = 4000;

interface Person {
  lat: number; lon: number; city: string;
  base: THREE.Vector3; east: THREE.Vector3; north: THREE.Vector3; up: THREE.Vector3;
  angle: number; radius: number; speed: number; phase: number; drinkEvery: number;
}

function hash(i: number): number {
  let x = (i + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const SHIRTS = ['#ff4f6d', '#ffb238', '#3ec7ff', '#7bdc4a', '#b678ff', '#ff7a2f', '#2fd6b4', '#ffe14d', '#ff63c8', '#4d7cff'];
const SKINS = ['#f5d0b0', '#e8b48f', '#c68a62', '#9a6440', '#6e4428', '#f1c7a5'];

export class People {
  readonly group = new THREE.Group();
  private bodies: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private cups: THREE.InstancedMesh;
  private persons: Person[] = [];
  private cumWeights: number[] = [];
  private shown = 0;
  private dummy = new THREE.Object3D();
  private assets: EarthAssets;
  /** Wie viele echte Menschen eine Figur darstellt. */
  perFigure = 1;
  /** Größe einer Figur (Szeneneinheiten), wird je nach Kameraabstand gesetzt. */
  figureSize = 0.004;

  constructor(assets: EarthAssets) {
    this.assets = assets;
    const body = new THREE.CapsuleGeometry(0.22, 0.42, 4, 10).translate(0, 0.45, 0);
    const legs = new THREE.CylinderGeometry(0.16, 0.12, 0.25, 8).translate(0, 0.12, 0);
    const bodyGeo = mergeGeometries([body, legs])!;
    const headGeo = new THREE.SphereGeometry(0.24, 14, 10).translate(0, 1.05, 0);
    const cupGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.18, 8).translate(0.3, 0.75, 0.12);
    const toon = (c?: string) => new THREE.MeshStandardMaterial({ color: c ?? '#ffffff', roughness: 0.55, metalness: 0 });
    this.bodies = new THREE.InstancedMesh(bodyGeo, toon(), MAX_FIGURES);
    this.heads = new THREE.InstancedMesh(headGeo, toon(), MAX_FIGURES);
    this.cups = new THREE.InstancedMesh(cupGeo, new THREE.MeshStandardMaterial({ color: '#7fd8ff', roughness: 0.1, emissive: '#1b6fb0', emissiveIntensity: 0.4 }), MAX_FIGURES);
    for (const m of [this.bodies, this.heads, this.cups]) {
      m.count = 0;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(m);
    }
    const c = new THREE.Color();
    for (let i = 0; i < MAX_FIGURES; i++) {
      this.bodies.setColorAt(i, c.set(SHIRTS[Math.floor(hash(i * 7 + 1) * SHIRTS.length)]));
      this.heads.setColorAt(i, c.set(SKINS[Math.floor(hash(i * 7 + 2) * SKINS.length)]));
    }
    // Städte gewichten (Wurzel der Einwohnerzahl -> auch kleinere Städte bekommen Leute)
    let acc = 0;
    for (const city of assets.cities) { acc += Math.sqrt(city.pop); this.cumWeights.push(acc); }
  }

  private makePerson(i: number): Person {
    const r = hash(i * 7 + 3) * this.cumWeights[this.cumWeights.length - 1];
    let lo = 0, hi = this.cumWeights.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.cumWeights[mid] < r) lo = mid + 1; else hi = mid; }
    const city = this.assets.cities[lo];
    // kleine Streuung um die Stadt
    const lat = city.lat + (hash(i * 7 + 4) - 0.5) * 0.25;
    const lon = city.lon + (hash(i * 7 + 5) - 0.5) * 0.25;
    const h = Math.max(0, sampleElevation(this.assets, lat, lon));
    const f = tangentFrame(lat, lon);
    return {
      lat, lon, city: city.name,
      base: latLonToVec3(lat, lon, 1 + (h * RELIEF_EXAGGERATION) / EARTH_RADIUS_M), ...f,
      angle: hash(i * 7 + 6) * Math.PI * 2, radius: 0.5 + hash(i * 11) * 2.5,
      speed: (0.25 + hash(i * 13) * 0.5) * (hash(i * 17) < 0.5 ? -1 : 1),
      phase: hash(i * 19) * 10, drinkEvery: 3 + hash(i * 23) * 5,
    };
  }

  /** Aktuelle 3D-Position über dem Kopf einer Figur (für Zeiger-Sticker). */
  positionOf(i: number): THREE.Vector3 | null {
    if (i >= this.shown) return null;
    const m = new THREE.Matrix4();
    this.heads.getMatrixAt(i, m);
    return new THREE.Vector3(0, 1.45, 0).applyMatrix4(m);
  }

  /** Ort von Mensch Nr. 1 (für Nahaufnahmen). */
  firstPerson(): { lat: number; lon: number; city: string } {
    const p = this.persons[0] ?? this.makePerson(0);
    return { lat: p.lat, lon: p.lon, city: p.city };
  }

  /** Setzt die echte Einwohnerzahl (exakt, BigInt). */
  setPopulation(population: bigint): void {
    const shown = population > BigInt(MAX_FIGURES) ? MAX_FIGURES : Number(population);
    this.perFigure = population > BigInt(MAX_FIGURES) ? Number((population + BigInt(MAX_FIGURES) - 1n) / BigInt(MAX_FIGURES)) : 1;
    while (this.persons.length < shown) this.persons.push(this.makePerson(this.persons.length));
    this.shown = shown;
    this.bodies.count = this.heads.count = this.cups.count = shown;
  }

  update(time: number): void {
    const s = this.figureSize;
    const d = this.dummy, tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), m = new THREE.Matrix4();
    for (let i = 0; i < this.shown; i++) {
      const p = this.persons[i];
      const a = p.angle + time * p.speed / p.radius;
      const r = p.radius * s * (this.shown === 1 ? 0.6 : 2.2);
      // Laufen im Kreis um einen Treffpunkt (Gruppen in der Stadt)
      tmp.copy(p.base).addScaledVector(p.east, Math.cos(a) * r).addScaledVector(p.north, Math.sin(a) * r);
      const bob = Math.abs(Math.sin(time * 9 + p.phase)) * 0.12 * s;
      tmp.addScaledVector(p.up, bob);
      fwd.copy(p.east).multiplyScalar(-Math.sin(a) * Math.sign(p.speed)).addScaledVector(p.north, Math.cos(a) * Math.sign(p.speed));
      // Trinken: alle paar Sekunden kurz nach hinten lehnen
      const drink = Math.max(0, Math.sin((time + p.phase) * Math.PI * 2 / p.drinkEvery) - 0.85) / 0.15;
      m.lookAt(new THREE.Vector3(), fwd, p.up);
      d.position.copy(tmp);
      d.quaternion.setFromRotationMatrix(m);
      d.rotateX(-drink * 0.35);
      d.rotateZ(Math.sin(time * 9 + p.phase) * 0.08);
      d.scale.setScalar(s);
      d.updateMatrix();
      this.bodies.setMatrixAt(i, d.matrix);
      this.heads.setMatrixAt(i, d.matrix);
      this.cups.setMatrixAt(i, d.matrix);
    }
    this.bodies.instanceMatrix.needsUpdate = this.heads.instanceMatrix.needsUpdate = this.cups.instanceMatrix.needsUpdate = true;
  }
}
