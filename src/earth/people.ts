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
import { Crowd, FarCrowd, type Look, type Pose, lookFor } from './characters.ts';
import { type EarthAssets, sampleElevation } from './assets.ts';
import { RELIEF_EXAGGERATION } from './earthMaterial.ts';
import { EARTH_RADIUS_M, latLonToVec3, tangentFrame } from './geo.ts';

export const MAX_FIGURES = 4000;
/** Höchstens so viele Figuren in voller Detailstufe gleichzeitig. */
export const NAH_MAX = 400;

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

export class People {
  readonly group = new THREE.Group();
  /** Alle Einwohner im einheitlichen Charakterstil (siehe characters.ts). */
  private crowd = new Crowd(NAH_MAX);
  /** Vereinfachte Figuren für die Fernsicht. */
  private far = new FarCrowd(MAX_FIGURES);
  private looks: Look[] = [];
  /** Nahmodus: volle Detailstufe für die Figuren nahe der Kamera (wird von der Szene gesetzt). */
  nah = false;
  /** Kameraposition (für die Auswahl der nächsten Figuren im Nahmodus). */
  kamera = new THREE.Vector3();
  private persons: Person[] = [];
  private cumWeights: number[] = [];
  private shown = 0;
  /** Kopfposition der ersten Figuren (für Zeiger-Sticker). */
  private headPos: THREE.Vector3[] = [];
  private assets: EarthAssets;
  /** Wie viele echte Menschen eine Figur darstellt. */
  perFigure = 1;
  /** Plattformen (Grundstück/Dorf): Figuren darauf stehen auf deren Höhe statt auf dem Gelände. */
  platforms: { up: THREE.Vector3; cosR: number; r: number; active: boolean }[] = [];
  /** Größe einer Figur (Szeneneinheiten), wird je nach Kameraabstand gesetzt. */
  figureSize = 0.004;

  constructor(assets: EarthAssets) {
    this.assets = assets;
    this.group.add(this.crowd.group, this.far.group);
    for (let i = 0; i < MAX_FIGURES; i++) { this.looks[i] = lookFor(i, hash); this.far.setLook(i, this.looks[i]); }
    // Städte gewichten (Wurzel der Einwohnerzahl -> auch kleinere Städte bekommen Leute)
    let acc = 0;
    for (const city of assets.cities) { acc += Math.pow(city.pop, 0.8); this.cumWeights.push(acc); }
  }

  private makePerson(i: number): Person {
    const r = hash(i * 7 + 3) * this.cumWeights[this.cumWeights.length - 1];
    let lo = 0, hi = this.cumWeights.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.cumWeights[mid] < r) lo = mid + 1; else hi = mid; }
    const city = this.assets.cities[lo];
    // kleine Streuung um die Stadt
    const lat = city.lat + (hash(i * 7 + 4) - 0.5) * 0.11;
    const lon = city.lon + (hash(i * 7 + 5) - 0.5) * 0.11;
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
    if (i >= this.shown || !this.headPos[i]) return null;
    return this.headPos[i].clone();
  }

  /** Stadt mit den meisten gezeigten Figuren (für Gruppen-Nahaufnahmen). */
  busiestCity(): { lat: number; lon: number; city: string; count: number } {
    const m = new Map<string, { lat: number; lon: number; n: number }>();
    for (let i = 0; i < this.shown; i++) {
      const p = this.persons[i];
      const e = m.get(p.city) ?? { lat: 0, lon: 0, n: 0 };
      e.lat += p.lat; e.lon += p.lon; e.n++;
      m.set(p.city, e);
    }
    let best = { lat: 0, lon: 0, city: '', count: 0 };
    for (const [city, e] of m) if (e.n > best.count) best = { lat: e.lat / e.n, lon: e.lon / e.n, city, count: e.n };
    return best;
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
    this.far.setCount(shown);
  }

  /**
   * Bewegung: Jeder Mensch hat einen festen Tagesablauf aus Laufen, Stehenbleiben + Trinken,
   * Winken und (bei Paaren) Anstoßen. Alles hängt nur von der Zeit ab -> jedes Bild ist reproduzierbar.
   */
  update(time: number): void {
    const s = this.figureSize;
    const base = new THREE.Matrix4(), rot = new THREE.Matrix4(), tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
    const zero = new THREE.Vector3();
    // Nahmodus: nur die (bis zu NAH_MAX) Figuren nahe der Kamera in voller Qualität
    let liste: number[];
    if (this.nah) {
      const d = this.persons.slice(0, this.shown).map((p, i) => [p.base.distanceToSquared(this.kamera), i] as const);
      d.sort((a, b) => a[0] - b[0]);
      liste = d.slice(0, NAH_MAX).map((x) => x[1]);
    } else liste = Array.from({ length: this.shown }, (_, i) => i);
    this.crowd.setCount(this.nah ? liste.length : 0);
    this.far.setCount(this.nah ? 0 : this.shown);
    let slot = 0;
    for (const i of liste) {
      const p = this.persons[i];
      // Zyklus: 0–4 s laufen, 4–5.6 s stehen + trinken, 5.6–6.4 s winken (jeder mit eigener Verschiebung)
      const cyc = 6.4 + p.drinkEvery * 0.3;
      const tc = ((time + p.phase * 3) % cyc + cyc) % cyc;
      const walking = tc < 4;
      const walkT = Math.floor((time + p.phase * 3) / cyc) * 4 + Math.min(tc, 4);  // nur Laufzeit zählt für den Weg
      const a = p.angle + walkT * p.speed / p.radius;
      const r = p.radius * Math.min(s, 0.0009) * (this.shown === 1 ? (this.nah ? 0.08 : 0.6) : 2.2);
      tmp.copy(p.base);
      for (const pl of this.platforms) if (pl.active && p.up.dot(pl.up) > pl.cosR) tmp.copy(p.up).multiplyScalar(pl.r);
      tmp.addScaledVector(p.east, Math.cos(a) * r).addScaledVector(p.north, Math.sin(a) * r);
      const step = time * 7 + p.phase;
      if (walking) tmp.addScaledVector(p.up, Math.abs(Math.sin(step)) * 0.06 * s);
      fwd.copy(p.east).multiplyScalar(-Math.sin(a) * Math.sign(p.speed)).addScaledVector(p.north, Math.cos(a) * Math.sign(p.speed));
      // Solo-Auftritt (nur 1 Einwohner, Nahaufnahme): schaut zur Kamera
      const solo = this.nah && this.shown === 1;
      if (solo) {
        fwd.copy(this.kamera).sub(tmp);
        fwd.addScaledVector(p.up, -fwd.dot(p.up)).normalize();
      }
      // beim Trinken/Winken leicht zur Kamera-nahen Seite drehen (wirkt lebendiger)
      rot.lookAt(fwd, zero, p.up);   // Gesicht (+z) zeigt in Blick-/Laufrichtung
      base.compose(tmp, new THREE.Quaternion().setFromRotationMatrix(rot), new THREE.Vector3(s, s, s));
      const pose: Pose = { legL: 0, legR: 0, armL: 0, armR: 0, liftL: 0, liftR: 0, drink: 0, headTilt: 0, bodyLean: 0 };
      if (solo) {
        // vor dem Haus: trinken, winken, kurz wippen
        const z = ((time + 0.5) % 5.2 + 5.2) % 5.2;
        if (z < 2.2) { const k = Math.sin((z / 2.2) * Math.PI); pose.drink = Math.min(1, k * 1.5); pose.headTilt = k * 0.35; }
        else if (z < 3.6) { const k = Math.sin(((z - 2.2) / 1.4) * Math.PI); pose.liftL = k * 0.95; pose.armL = Math.sin(time * 14) * 0.25 * k; }
        else { pose.bodyLean = Math.sin(time * 6) * 0.05; pose.armL = Math.sin(time * 6) * 0.1; pose.armR = -Math.sin(time * 6) * 0.1; }
      } else if (walking) {
        const sw = Math.sin(step) * 0.55;
        pose.legL = sw; pose.legR = -sw; pose.armL = -sw * 0.8; pose.armR = sw * 0.8; pose.bodyLean = 0.05;
      } else if (tc < 5.6) {
        const k = Math.sin(Math.min(1, (tc - 4) / 1.6) * Math.PI);   // Becher hoch und wieder runter
        pose.drink = Math.min(1, k * 1.4); pose.headTilt = k * 0.35;
      } else {
        const k = Math.sin(((tc - 5.6) / Math.max(0.1, cyc - 5.6)) * Math.PI);
        pose.liftL = k * 0.9; pose.armL = Math.sin(time * 14 + p.phase) * 0.25 * k;
      }
      if (this.nah) { this.crowd.setLook(slot, this.looks[i]); this.crowd.setPose(slot, base, pose); slot++; }
      else this.far.setPose(i, base);
      if (i < 8) this.headPos[i] = new THREE.Vector3(0, 1.45, 0).applyMatrix4(base);
    }
    if (this.nah) this.crowd.commit(); else this.far.commit();
  }
}
