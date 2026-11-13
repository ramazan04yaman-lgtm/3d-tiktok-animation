/**
 * KAMERA-REGIE: vordefinierte Einstellungen ("Shots") für die TikTok-Videos.
 * Wechsel zwischen Shots werden weich überblendet.
 */
import * as THREE from 'three';
import { latLonToVec3 } from './geo.ts';

export interface Shot {
  label: string;
  lat: number; lon: number;
  /** Abstand der Kamera zum Erdmittelpunkt (1 = Erdoberfläche). */
  dist: number;
  /** Neigung in Grad (0 = senkrecht von oben). */
  tilt: number;
  /** 0 = auf Erdmittelpunkt schauen, 1 = auf die Oberfläche. */
  focus: number;
  /** Automatische Drehung (Grad Länge pro Sekunde). */
  spin?: number;
  /** Kamerafahrt: Wegpunkte [lat, lon], Dauer in Sekunden. */
  path?: [number, number][];
  pathSeconds?: number;
  /** Zoom-Fahrt: Abstand ändert sich um so viel pro Sekunde (negativ = heranfahren). */
  zoom?: number;
  /** Grenze für die Zoom-Fahrt. */
  zoomBis?: number;
  /** Sonnenstand relativ zur Kamera [Grad Breite, Grad Länge] (Standard [18, 55]). */
  sonne?: [number, number];
  /** Feste Figurengröße in diesem Shot (Nahaufnahmen von Menschen). */
  figur?: number;
}

export const SHOTS: Record<string, Shot> = {
  kapitaen:  { label: '🧑‍✈️ Kapitän Durst (Moderator)', lat: 22, lon: -35, dist: 4.6, tilt: 0, focus: 0, spin: 5 },
  intro:     { label: '🎬 Intro: Weltall, langsamer Zoom', lat: 15, lon: -20, dist: 8.5, tilt: 0, focus: 0, spin: 7, zoom: -0.55, zoomBis: 4.2 },
  zoom:      { label: '🔍 Zoom auf die Erde', lat: 20, lon: 5, dist: 4.4, tilt: 4, focus: 0.4, spin: 6, zoom: -0.45, zoomBis: 2.4 },
  ozean:     { label: '🌊 Ozean-Nahaufnahme', lat: 14, lon: -162, dist: 1.4, tilt: 6, focus: 0.9, spin: 3, sonne: [9, 16] },
  rueckflug: { label: '🚀 Rückflug ins All', lat: 30, lon: 20, dist: 1.6, tilt: 10, focus: 0.6, spin: 9, zoom: 0.7, zoomBis: 4.6 },
  europa:    { label: '🌍 Europa (Küsten)', lat: 47, lon: 10, dist: 1.75, tilt: 10, focus: 1, spin: 2.5 },
  finale:    { label: '🎬 Finale: Erde im All', lat: 10, lon: -30, dist: 3.3, tilt: 0, focus: 0, spin: 10, zoom: 0.35, zoomBis: 5.2 },
  space:     { label: '🌍 Erde aus dem All', lat: 12, lon: 15, dist: 5.6, tilt: 0, focus: 0, spin: 6 },
  orbit:     { label: '🔄 Drehung um die Erde', lat: 8, lon: -40, dist: 4.2, tilt: 0, focus: 0, spin: 18 },
  europe:    { label: '🇪🇺 Europa', lat: 50, lon: 12, dist: 2.0, tilt: 14, focus: 1 },
  africa:    { label: '🌍 Afrika', lat: 3, lon: 20, dist: 2.6, tilt: 10, focus: 1 },
  asia:      { label: '🌏 Asien', lat: 30, lon: 95, dist: 2.6, tilt: 12, focus: 1 },
  americas:  { label: '🌎 Amerika', lat: 15, lon: -80, dist: 3.2, tilt: 8, focus: 1 },
  australia: { label: '🦘 Australien', lat: -24, lon: 134, dist: 2.1, tilt: 12, focus: 1 },
  northsea:  { label: '🌊 Nordsee (Küste)', lat: 55, lon: 3, dist: 1.3, tilt: 12, focus: 1 },
  sunda:     { label: '🏝️ Indonesien (Schelf)', lat: 0, lon: 110, dist: 1.35, tilt: 20, focus: 1 },
  pacific:   { label: '🌊 Pazifik', lat: 0, lon: -160, dist: 3.4, tilt: 0, focus: 0.5, spin: 4 },
  flyover:   {
    label: '✈️ Kamerafahrt: Ärmelkanal → Mittelmeer', lat: 50, lon: -2, dist: 1.1, tilt: 30, focus: 1,
    path: [[51.5, 2], [49.5, -4], [46, -6], [40, -10], [36, -6], [37, 3], [38, 12], [35, 20], [34, 28]], pathSeconds: 24,
  },
  bering:    {
    label: '✈️ Kamerafahrt: Beringstraße', lat: 60, lon: -175, dist: 1.12, tilt: 28, focus: 1,
    path: [[56, 170], [62, -178], [66, -169], [70, -165]], pathSeconds: 16,
  },
};

interface CamState { lat: number; lon: number; dist: number; tilt: number; focus: number }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function pathPos(path: [number, number][], u: number): [number, number] {
  const f = Math.min(0.9999, Math.max(0, u)) * (path.length - 1);
  const i = Math.floor(f), t = f - i;
  // Catmull-Rom für weiche Kurven
  const p0 = path[Math.max(0, i - 1)], p1 = path[i], p2 = path[i + 1], p3 = path[Math.min(path.length - 1, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}

export class CameraDirector {
  shotName = 'space';
  private from: CamState;
  private cur: CamState;
  private transStart = -1;
  private transDur = 3;
  private shotStart = 0;
  /** Freie Kamera (Maus) aktiv? */
  free = false;

  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    const s = SHOTS.space;
    this.cur = { lat: s.lat, lon: s.lon, dist: s.dist, tilt: s.tilt, focus: s.focus };
    this.from = { ...this.cur };
  }

  setShot(name: string, time: number, transition = 3): void {
    if (!SHOTS[name]) throw new Error(`Unbekannter Shot: ${name}`);
    this.from = { ...this.cur };
    this.shotName = name;
    this.transStart = time;
    this.transDur = transition;
    this.shotStart = time;
    this.free = false;
  }

  /** Zielzustand des Shots zum Zeitpunkt `time`. */
  private target(time: number): CamState {
    const s = SHOTS[this.shotName];
    const t = time - this.shotStart;
    let lat = s.lat, lon = s.lon;
    if (s.path) [lat, lon] = pathPos(s.path, ((t / (s.pathSeconds ?? 20)) % 1 + 1) % 1);
    if (s.spin) lon += s.spin * t;
    let dist = s.dist;
    if (s.zoom) {
      // weiche Zoom-Fahrt (bremst zum Ziel hin ab)
      const lim = s.zoomBis ?? (s.zoom < 0 ? 1.1 : 8);
      const span = lim - s.dist;
      const k = 1 - Math.exp(-Math.abs(s.zoom * t / (span || 1)));
      dist = s.dist + span * k;
    }
    return { lat, lon, dist, tilt: s.tilt, focus: s.focus };
  }

  update(time: number): CamState {
    if (this.free) return this.cur;
    const goal = this.target(time);
    const k = this.transStart < 0 ? 1 : ease(Math.min(1, (time - this.transStart) / this.transDur));
    // Beim Wechsel zwischen zwei nahen Shots kurz herauszoomen (Bogen statt Durchfliegen)
    const lift = Math.sin(Math.PI * k) * Math.max(0, Math.min(1.2, Math.abs(goal.lon - this.from.lon) / 120 + Math.abs(goal.lat - this.from.lat) / 80)) * (k < 1 ? 1 : 0);
    this.cur = {
      lat: lerp(this.from.lat, goal.lat, k),
      lon: lerpAngle(this.from.lon, goal.lon, k),
      dist: lerp(this.from.dist, goal.dist, k) + lift,
      tilt: lerp(this.from.tilt, goal.tilt, k),
      focus: lerp(this.from.focus, goal.focus, k),
    };
    this.apply(this.cur);
    return this.cur;
  }

  private apply(c: CamState): void {
    const target = latLonToVec3(c.lat, c.lon, c.focus);
    const pos = latLonToVec3(c.lat - c.tilt, c.lon, c.dist);
    this.camera.position.copy(pos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);
  }

  /** Für die Sonne: aktueller Blickpunkt in Grad. */
  get state(): CamState { return this.cur; }
  syncFromCamera(): void {
    const p = this.camera.position;
    const r = p.length();
    this.cur = { lat: Math.asin(p.y / r) * 180 / Math.PI, lon: Math.atan2(-p.z, p.x) * 180 / Math.PI, dist: r, tilt: 0, focus: 0 };
  }
}
