import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';

/**
 * Episode 10: "Wie funktioniert eine Heizung?" World: 1 unit ≈ 50 cm.
 * Basement floor y = 0, ceiling slab 4.5–5.0, room floor y = 5. Back walls at z = −2.6.
 * T holds the narration-driven times (audio/heating-voice.json).
 */
export const T = {
  hook: [0, 4.9] as const,
  boiler: [4.9, 11.1] as const,
  pump: [11.1, 16.5] as const,
  radiator: [16.5, 23.0] as const,
  air: [23.0, 26.5] as const,
  cta: [26.6, 33.6] as const,
  condense: [33.7, 41.8] as const,
  thermo: [41.9, 50.2] as const,
  reveal: [50.2, 60] as const,
};

export const heatingTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: T.boiler[0], title: 'Die Heizung' },
    { id: 'boiler', start: T.boiler[0], end: T.pump[0], title: 'Die Gastherme' },
    { id: 'circuit', start: T.pump[0], end: T.air[0], title: 'Kreislauf & Heizkörper' },
    { id: 'air', start: T.air[0], end: T.condense[0], title: 'Warme Luft' },
    { id: 'condense', start: T.condense[0], end: T.thermo[0], title: 'Brennwert' },
    { id: 'thermo', start: T.thermo[0], end: T.reveal[0], title: 'Das Thermostat' },
    { id: 'reveal', start: T.reveal[0], end: 60, title: 'Das Überraschende' },
  ],
  captions: [
    { start: 0.3, end: T.boiler[0] - 0.1, text: 'Auf 5 = schneller warm?', sub: 'Ein Irrtum, den fast jeder hat' },
    { start: T.boiler[0], end: 7.6, text: 'Die Gastherme', sub: 'verbrennt Gas im Keller' },
    { start: 7.7, end: T.pump[0], text: 'Bis 70 °C', sub: 'Wasser im Wärmetauscher' },
    { start: T.pump[0] + 0.1, end: T.radiator[0], text: 'Die Pumpe', sub: 'drückt das Wasser im Kreis' },
    { start: T.radiator[0] + 0.1, end: T.air[0], text: 'Der Heizkörper', sub: 'oben heiß hinein, unten kühler zurück' },
    { start: T.air[0] + 0.1, end: T.cta[0], text: 'Warme Luft steigt', sub: 'die Raumluft wälzt sich um' },
    { start: T.cta[0], end: T.condense[0], text: 'Die Luftwalze', sub: 'kalt am Boden, warm unter der Decke' },
    { start: T.condense[0] + 0.1, end: T.thermo[0], text: 'Der Brennwert-Trick', sub: 'Dampf kondensiert und gibt Wärme ab' },
    { start: T.thermo[0] + 0.1, end: T.reveal[0], text: 'Das Thermostat', sub: 'Wachs dehnt sich aus → Ventil zu' },
    { start: T.reveal[0] + 0.1, end: 60, text: 'Stufe 5 ≠ schneller', sub: 'nur höhere Zieltemperatur ≈ 28 °C' },
  ],
});

// ---------------------------------------------------------------------------------------------
export const FLOOR = 5;
/** wall-hung gas condensing boiler (casing box) */
export const BOILER = { x: -1.6, y: 2.6, z: -2.2, w: 1.0, h: 1.5, d: 0.7 };
/** burner / heat exchanger centre */
export const BURNER: Vec3 = [BOILER.x, BOILER.y + 0.15, BOILER.z];
export const PUMP: Vec3 = [-1.45, 1.5, -2.2];
/** panel radiator under the window */
export const RAD = { x0: -0.9, x1: 1.5, y0: FLOOR + 0.4, y1: FLOOR + 1.6, z: -2.35, d: 0.2 };
/** thermostatic valve body and head (head axis +x) */
export const VALVE: Vec3 = [1.68, FLOOR + 1.45, -2.35];
export const HEAD: Vec3 = [1.86, FLOOR + 1.45, -2.35];
/** magnifier positions (world) */
export const LENS = {
  cond: [-0.75, 2.2, -1.1] as Vec3,
  thermo: [2.25, FLOOR + 1.95, -1.35] as Vec3,
  s3: [-0.62, FLOOR + 2.3, 0.2] as Vec3,
  s5: [0.62, FLOOR + 2.3, 0.2] as Vec3,
};
export const LENS_R = { cond: 0.62, thermo: 0.55, cmp: 0.52 };

const HOUSE: Vec3 = [0, 4.6, -1.6];
const ROOM: Vec3 = [0.1, FLOOR + 2.4, -0.8];

export const heatingCamera = new CameraPath([
  // hook: extreme close-up of the thermostat head turning to 5
  orbit(0, HEAD, 30, 8, 1.25, { fov: 38, stop: true }),
  orbit(3.2, HEAD, 16, 6, 1.0, { fov: 38 }),
  // down to the basement: the boiler, then the burner inside
  orbit(5.8, [-0.2, 4.6, -2.0], 12, 4, 8.0, { fov: 38 }),
  orbit(7.9, [BOILER.x + 0.1, BOILER.y, BOILER.z], 16, 6, 4.4, { fov: 38 }),
  orbit(10.0, BURNER, 26, 4, 2.2, { fov: 38 }),
  // pump & pipes, whole house
  orbit(11.8, [-0.6, 2.2, -2.2], 12, 6, 5.4, { fov: 38 }),
  orbit(14.6, HOUSE, 16, 6, 11.6, { fov: 38 }),
  // radiator section
  orbit(17.6, [0.35, FLOOR + 1.0, -2.35], 12, 6, 4.6, { fov: 38 }),
  orbit(20.6, [0.45, FLOOR + 1.0, -2.35], 22, 4, 3.9, { fov: 38 }),
  // the air in the room (convection), CTA
  orbit(23.8, ROOM, 22, 6, 9.6, { fov: 38 }),
  orbit(28.0, ROOM, 32, 8, 9.2, { fov: 38 }),
  orbit(31.6, ROOM, 22, 6, 9.0, { fov: 38 }),
  // condensing: magnifier at the bottom of the heat exchanger
  orbit(34.6, [BOILER.x + 0.3, 2.3, -1.7], 18, 4, 3.4, { fov: 38 }),
  orbit(37.0, LENS.cond, 6, 4, 3.0, { fov: 38 }),
  orbit(40.4, LENS.cond, -6, 4, 3.1, { fov: 38 }),
  // thermostat: head, then the section magnifier
  orbit(43.6, [2.0, FLOOR + 1.6, -1.9], 28, 8, 1.8, { fov: 38 }),
  orbit(46.0, LENS.thermo, 10, 4, 2.6, { fov: 38 }),
  orbit(49.4, LENS.thermo, -4, 4, 2.7, { fov: 38 }),
  // reveal: setting 3 vs setting 5 side by side
  orbit(52.6, [0, FLOOR + 2.3, 0.2], 4, 4, 5.0, { fov: 38 }),
  orbit(56.4, [0, FLOOR + 2.3, 0.2], 0, 4, 4.8, { fov: 38 }),
  orbit(60, [0, FLOOR + 2.3, 0.2], -2, 4, 4.7, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** thermostat head setting (3 → 5 in the hook) */
export const setting = (t: number) => 3 + 2 * ramp(t, 0.8, 2.6);
/** burner flame */
export const flame = (t: number) => ramp(t, 5.4, 6.4);
/** pump running / water circulating */
export const pump = (t: number) => ramp(t, 7.6, 8.6);
/** supply temperature °C */
export const supplyTemp = (t: number) => 25 + 45 * ramp(t, 7.8, 10.8);
/** radiator warms up once the hot water arrives */
export const radHeat = (t: number) => ramp(t, 14.6, 19.0);
/** convection in the room */
export const air = (t: number) => ramp(t, 19.5, 23.6) * (1 - 0.6 * ramp(t, 41.5, 43.0));
/** boiler casing turns to x-ray */
export const boilerXray = (t: number) => ramp(t, 6.0, 7.4) * (1 - 0.7 * ramp(t, 13.4, 14.6)) + 0.7 * ramp(t, 33.8, 34.8);
/** radiator front panel turns to x-ray */
export const radXray = (t: number) => ramp(t, 15.8, 17.4) * (1 - ramp(t, 23.4, 24.6));
export const lensCond = (t: number) => envelope(t, T.condense[0] + 1.6, T.condense[0] + 2.6, T.condense[1] - 0.3, T.condense[1] + 0.5);
export const lensThermo = (t: number) => envelope(t, T.thermo[0] + 1.6, T.thermo[0] + 2.6, T.thermo[1] - 0.2, T.thermo[1] + 0.5);
export const lensCmp = (t: number) => ramp(t, T.reveal[0] + 0.3, T.reveal[0] + 1.3);
/** condensation progress inside the magnifier */
export const condense = (t: number) => ramp(t, T.condense[0] + 2.6, T.condense[1] - 0.5);
/** room temperature in the thermostat scene (setting 3 ≈ 20 °C) */
export const roomThermo = (t: number) => 16 + 4.6 * ramp(t, T.thermo[0] + 3.4, T.thermo[1] - 1.2);
/** room temperature in the reveal: cold, then reaches 20 °C at the end */
export const roomReveal = (t: number) => 16 + 4.4 * ramp(t, 55.6, 59.2);
/** wax expansion 0..1 for a given room temp and set point (P-controller band ≈ 2 K) */
export const expansion = (room: number, setPoint: number) => Math.min(1, Math.max(0, (room - (setPoint - 2)) / 2));
export const hudSupply = (t: number) => envelope(t, 7.6, 8.2, T.pump[0] - 0.2, T.pump[0] + 0.4);
export const hudRoom = (t: number) => envelope(t, T.thermo[0] + 2.6, T.thermo[0] + 3.2, T.thermo[1] - 0.4, T.thermo[1] + 0.2) + envelope(t, T.reveal[0] + 1.0, T.reveal[0] + 1.6, 60, 61);
/** snow outside the window */
export const snow = (_t: number) => 1;

export const labels = {
  head: (t: number) => envelope(t, 1.0, 1.4, 4.2, 4.6),
  burner: (t: number) => envelope(t, 7.0, 7.4, 8.9, 9.3),
  exchanger: (t: number) => envelope(t, 9.2, 9.6, 10.8, 11.2),
  pump: (t: number) => envelope(t, 11.6, 12.0, 13.8, 14.2),
  supply: (t: number) => envelope(t, 14.0, 14.4, 16.2, 16.6),
  ret: (t: number) => envelope(t, 14.4, 14.8, 16.2, 16.6),
  hot: (t: number) => envelope(t, 17.8, 18.2, 22.4, 22.8),
  cool: (t: number) => envelope(t, 19.2, 19.6, 22.4, 22.8),
  cold: (t: number) => envelope(t, 24.0, 24.4, 26.0, 26.4),
  vapour: (t: number) => envelope(t, 36.4, 36.8, 38.6, 39.0),
  cond: (t: number) => envelope(t, 38.8, 39.2, 41.4, 41.8),
  wax: (t: number) => envelope(t, 44.6, 45.0, 47.4, 47.8),
  valve: (t: number) => envelope(t, 47.6, 48.0, 49.8, 50.2),
  s3: (t: number) => envelope(t, 51.4, 51.8, 60, 61),
  s5: (t: number) => envelope(t, 51.8, 52.2, 60, 61),
};
/** pipes and coil turn semi-transparent so the water inside is visible */
export const pipeXray = (t: number) => envelope(t, 7.2, 8.2, 22.8, 24.0);
