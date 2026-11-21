import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';

/**
 * Episode 9: "Wie funktioniert eine Spülmaschine?" World: 1 unit ≈ 12 cm, machine 60 × 82 × 57 cm.
 * T holds the narration-driven times (retimed to the recorded voice).
 */
export const T = {
  hook: [0, 6.6] as const,
  inlet: [6.9, 11.4] as const,
  soften: [11.8, 15.0] as const,
  heat: [15.3, 20.4] as const,
  pump: [20.7, 25.8] as const,
  recoil: [26.0, 33.3] as const,
  enzymes: [33.6, 40.4] as const,
  filter: [40.7, 46.7] as const,
  rinse: [46.9, 51.2] as const,
  dry: [51.4, 56.9] as const,
  compare: [57.0, 60] as const,
};

export const dishTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: T.inlet[0], title: 'Die Spülmaschine' },
    { id: 'water', start: T.inlet[0], end: T.pump[0], title: 'Wasser & Wärme' },
    { id: 'spray', start: T.pump[0], end: T.enzymes[0], title: 'Pumpe & Sprüharme' },
    { id: 'clean', start: T.enzymes[0], end: T.rinse[0], title: 'Reinigen' },
    { id: 'dry', start: T.rinse[0], end: T.compare[0], title: 'Klarspülen & Trocknen' },
    { id: 'compare', start: T.compare[0], end: 60, title: 'Das Überraschende' },
  ],
  captions: [
    { start: 0.3, end: T.inlet[0] - 0.2, text: 'Ohne Motor?', sub: 'Die Sprüharme drehen sich von selbst' },
    { start: T.inlet[0], end: T.soften[0], text: 'Nur ≈ 10 Liter', sub: 'Wasser strömt in die Maschine' },
    { start: T.soften[0], end: T.heat[0], text: 'Der Enthärter', sub: 'Spezialsalz hält ihn frei von Kalk' },
    { start: T.heat[0], end: T.pump[0], text: 'Aufheizen', sub: 'bis zu 70 °C' },
    { start: T.pump[0], end: T.recoil[0], text: 'Die Umwälzpumpe', sub: 'drückt das Wasser in die Sprüharme' },
    { start: T.recoil[0], end: T.enzymes[0], text: 'Der Rückstoß', sub: 'schräge Düsen drehen die Arme' },
    { start: T.enzymes[0], end: T.filter[0], text: 'Enzyme', sub: 'zerlegen Stärke und Eiweiß' },
    { start: T.filter[0], end: T.rinse[0], text: 'Sieb & Kreislauf', sub: 'dasselbe Wasser läuft immer wieder' },
    { start: T.rinse[0], end: T.dry[0], text: 'Klarspüler', sub: 'Wasser perlt ab statt Tropfen' },
    { start: T.dry[0], end: T.compare[0], text: 'Trocknen', sub: 'Dampf kondensiert an den Wänden' },
    { start: T.compare[0] + 0.1, end: 60, text: 'Spart Wasser', sub: 'von Hand oft 4× so viel' },
  ],
});

// ---------------------------------------------------------------------------------------------
export const HUB_LOW: Vec3 = [0, 1.08, 0];
export const HUB_UP: Vec3 = [0, 3.72, 0];
export const SOFTENER: Vec3 = [-1.55, 0.42, -1.3];
export const PUMP: Vec3 = [0.55, 0.38, 0.2];
export const DISPENSER: Vec3 = [0.6, 3.0, 2.25];
export const SUMP: Vec3 = [0, 0.62, 0.3];
/** magnifier positions (world) */
export const LENS = {
  soft: [-0.6, 1.5, 2.9] as Vec3,
  enzyme: [1.0, 2.6, 3.0] as Vec3,
  rinse: [-0.9, 2.3, 3.0] as Vec3,
};
const C: Vec3 = [0, 3.3, 0];

export const dishCamera = new CameraPath([
  // hook: lower spray arm spinning, extreme close-up
  orbit(0, [0.3, 1.5, 0.3], 16, 4, 3.4, { fov: 38, stop: true }),
  orbit(3.4, [0.2, 1.4, 0.3], 26, 8, 2.9, { fov: 38 }),
  orbit(6.4, C, 14, 8, 11.0, { fov: 38 }),
  // water in, softener, heating (base compartment)
  orbit(9.2, [-0.8, 0.45, -0.4], 16, 2, 4.6, { fov: 38 }),
  orbit(12.6, LENS.soft, 8, 4, 3.0, { fov: 38 }),
  orbit(15.6, [0.4, 0.45, 0.3], 20, 3, 3.8, { fov: 38 }),
  orbit(19.0, [0.55, 0.42, 0.3], 30, 2, 3.0, { fov: 38 }),
  // pump & pipes, then the spray arm with recoil arrows
  orbit(22.6, [0.2, 2.2, -0.2], 34, 10, 8.4, { fov: 38 }),
  orbit(26.4, [0.3, 1.5, 0.3], 20, 14, 3.6, { fov: 38 }),
  orbit(30.0, [0.2, 1.4, 0.2], 8, 30, 3.4, { fov: 38 }),
  orbit(33.2, [0.6, 2.8, 1.4], 16, 8, 4.0, { fov: 38 }),
  // enzymes (magnifier on a plate)
  orbit(35.6, LENS.enzyme, 6, 4, 2.0, { fov: 38 }),
  orbit(39.6, LENS.enzyme, -4, 4, 2.1, { fov: 38 }),
  // filter & recirculation
  orbit(42.4, [0, 0.55, 0.3], 22, 2, 3.4, { fov: 38 }),
  orbit(46.0, C, 18, 10, 10.0, { fov: 38 }),
  // rinse aid (magnifier on a glass), drying
  orbit(48.6, LENS.rinse, -6, 4, 2.0, { fov: 38 }),
  orbit(52.4, [1.75, 5.1, 0.2], 10, 4, 4.4, { fov: 38 }),
  orbit(55.6, C, 20, 8, 10.4, { fov: 38 }),
  // comparison
  orbit(58.2, [0, 3.0, 2.6], 10, 8, 9.6, { fov: 38 }),
  orbit(60, [0, 3.0, 2.6], 6, 8, 10.0, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** pump running (0..1): hook spin, then the wash from the pump scene to the end of the rinse */
export const pump = (t: number) => envelope(t, -1, 0, 5.8, 6.6) + envelope(t, T.pump[0] + 0.4, T.pump[0] + 1.4, T.rinse[1] - 0.4, T.rinse[1] + 0.4);
/** spray arm angle: integral of ω ∝ pump (tabulated per frame) */
const _ang: number[] = [];
export const armAngleFast = (t: number) => {
  const i = Math.max(0, Math.floor(t * 30));
  if (_ang.length === 0) {
    let a = 0;
    for (let k = 0; k <= 60 * 30 + 2; k++) {
      _ang.push(a);
      a += pump(k / 30) * 4.2 / 30;
    }
  }
  const f = t * 30 - i;
  return _ang[Math.min(i, _ang.length - 1)] * (1 - f) + _ang[Math.min(i + 1, _ang.length - 1)] * f;
};
export const inflow = (t: number) => envelope(t, T.inlet[0] + 0.3, T.inlet[0] + 0.9, T.soften[1] - 0.4, T.soften[1] + 0.2);
/** litres in the machine */
export const litres = (t: number) => 10 * ramp(t, T.inlet[0] + 0.5, T.soften[1]);
export const sumpLevel = (t: number) => ramp(t, T.inlet[0] + 0.5, T.soften[1]) * (1 - 0.45 * pump(t)) * (1 - ramp(t, T.rinse[1], T.rinse[1] + 1.5));
export const heater = (t: number) => envelope(t, T.heat[0] + 0.2, T.heat[0] + 1.2, T.recoil[1], T.recoil[1] + 1.5) + 0.6 * envelope(t, T.rinse[0], T.rinse[0] + 0.6, T.rinse[1] - 0.3, T.rinse[1] + 0.4);
export const temperature = (t: number) => {
  const up = ramp(t, T.heat[0] + 0.5, T.heat[1]);
  const keep = 1 - 0.35 * ramp(t, T.filter[0], T.rinse[0]);
  const cool = 1 - 0.55 * ramp(t, T.dry[0], T.dry[1] + 2);
  return 20 + 50 * up * keep * cool + 15 * envelope(t, T.rinse[0], T.rinse[0] + 1, T.dry[0], T.dry[0] + 2);
};
export const hudWater = (t: number) => envelope(t, T.inlet[0] + 0.2, T.inlet[0] + 0.8, T.soften[1] - 0.3, T.soften[1] + 0.2);
export const hudTemp = (t: number) => envelope(t, T.heat[0], T.heat[0] + 0.6, T.pump[0] + 0.6, T.pump[0] + 1.2) + envelope(t, T.dry[0], T.dry[0] + 0.6, T.dry[1] - 0.4, T.dry[1] + 0.2);
export const lensSoft = (t: number) => envelope(t, T.soften[0] - 0.4, T.soften[0] + 0.4, T.soften[1] - 0.2, T.soften[1] + 0.5);
export const lensEnzyme = (t: number) => envelope(t, T.enzymes[0] + 0.6, T.enzymes[0] + 1.4, T.enzymes[1] - 0.4, T.enzymes[1] + 0.3);
export const lensRinse = (t: number) => envelope(t, T.rinse[0] + 0.2, T.rinse[0] + 1.0, T.rinse[1] - 0.2, T.rinse[1] + 0.5);
export const arrows = (t: number) => envelope(t, T.recoil[0] + 2.4, T.recoil[0] + 3.0, T.recoil[1] - 0.5, T.recoil[1]);
export const dispenser = (t: number) => ramp(t, T.enzymes[0] + 0.1, T.enzymes[0] + 0.7);
/** dirt on the dishes (washed off from the start of the main wash) */
export const dirt = (t: number) => 1 - ramp(t, T.pump[0] + 2, T.filter[1]);
export const sieve = (t: number) => envelope(t, T.filter[0] + 0.3, T.filter[0] + 1.0, T.filter[1] - 0.4, T.filter[1]);
export const steam = (t: number) => envelope(t, T.dry[0] - 0.2, T.dry[0] + 0.8, T.dry[1] - 0.4, T.dry[1] + 0.4);
export const condense = (t: number) => ramp(t, T.dry[0] + 0.8, T.dry[1]);
export const compare = (t: number) => ramp(t, T.compare[0], T.compare[0] + 0.8);
/** front door drawn as x-ray for the whole video (inside view from the first frame) */
export const xray = (_t: number) => 1;
/** dishes fade out while the spray arm is the subject (hook, recoil) */
export const dishes = (t: number) => 1 - envelope(t, -1, 0, 6.0, 7.0) - envelope(t, T.recoil[0] - 0.4, T.recoil[0] + 0.4, T.recoil[1] - 0.2, T.recoil[1] + 0.6);

export const labels = {
  arm: (t: number) => envelope(t, 1.0, 1.4, 4.2, 4.6),
  inlet: (t: number) => envelope(t, T.inlet[0] + 1.6, T.inlet[0] + 2.0, T.soften[0] - 0.3, T.soften[0]),
  soft: (t: number) => envelope(t, T.soften[0] + 0.6, T.soften[0] + 1.0, T.soften[1] - 0.2, T.soften[1] + 0.2),
  heater: (t: number) => envelope(t, T.heat[0] + 0.8, T.heat[0] + 1.2, T.pump[0] - 0.3, T.pump[0]),
  pump: (t: number) => envelope(t, T.pump[0] + 0.6, T.pump[0] + 1.0, T.pump[1] - 0.6, T.pump[1] - 0.2),
  jet: (t: number) => envelope(t, T.recoil[0] + 2.6, T.recoil[0] + 3.0, T.recoil[1] - 0.6, T.recoil[1] - 0.2),
  tab: (t: number) => envelope(t, T.enzymes[0] + 0.2, T.enzymes[0] + 0.6, T.enzymes[0] + 1.8, T.enzymes[0] + 2.2),
  enzyme: (t: number) => envelope(t, T.enzymes[0] + 2.2, T.enzymes[0] + 2.6, T.enzymes[1] - 0.5, T.enzymes[1] - 0.1),
  sieve: (t: number) => envelope(t, T.filter[0] + 0.8, T.filter[0] + 1.2, T.filter[1] - 0.8, T.filter[1] - 0.4),
  rinse: (t: number) => envelope(t, T.rinse[0] + 1.0, T.rinse[0] + 1.4, T.rinse[1] - 0.3, T.rinse[1] + 0.1),
  walls: (t: number) => envelope(t, T.dry[0] + 1.6, T.dry[0] + 2.0, T.dry[1] - 0.4, T.dry[1]),
  machine: (t: number) => envelope(t, T.compare[0] + 0.6, T.compare[0] + 1.0, 60, 61),
  hand: (t: number) => envelope(t, T.compare[0] + 1.0, T.compare[0] + 1.4, 60, 61),
};
