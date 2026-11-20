import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { HEAD } from './head';

/** Episode 7: "Was wächst in deinem Duschkopf?" — timed to audio/shower-voice.json. */
export const showerTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: 6.5, title: 'Der Duschkopf' },
    { id: 'inside', start: 6.5, end: 15.7, title: 'Im Inneren' },
    { id: 'biofilm', start: 15.7, end: 27.5, title: 'Kalk & Biofilm' },
    { id: 'aerosol', start: 27.5, end: 41.3, title: 'Beim Duschen' },
    { id: 'study', start: 41.3, end: 49.0, title: 'Das Überraschende' },
    { id: 'fix', start: 49.0, end: 60, title: 'Die Lösung' },
  ],
  captions: [
    { start: 0.3, end: 6.3, text: 'Schiefer Strahl?', sub: 'Dann wächst etwas im Duschkopf' },
    { start: 6.6, end: 15.5, text: 'Im Duschkopf', sub: 'dunkel, feucht, warm – ideal für Bakterien' },
    { start: 15.8, end: 22.6, text: 'Kalk & Biofilm', sub: 'Bakterien bauen einen Schleimbelag' },
    { start: 22.7, end: 27.5, text: 'Verstopfte Düsen', sub: 'der Strahl wird schief' },
    { start: 27.6, end: 36.0, text: 'Feine Tröpfchen', sub: 'gelangen beim Einatmen in die Lunge' },
    { start: 36.1, end: 41.2, text: 'Meist harmlos', sub: 'riskant bei schwachem Immunsystem' },
    { start: 41.4, end: 49.0, text: 'Bis zu 100× mehr', sub: 'Mykobakterien als im Leitungswasser' },
    { start: 49.1, end: 60, text: 'Die Lösung', sub: 'abreiben · entkalken · heiß vorlaufen' },
  ],
});

const H: Vec3 = [HEAD.x, HEAD.y, HEAD.z];
const h = (dx: number, dy: number, dz = 0): Vec3 => [HEAD.x + dx, HEAD.y + dy, HEAD.z + dz];
/** magnifier next to the head (camera side) */
export const MAG: Vec3 = h(0.62, -0.02, 0.18);

export const showerCamera = new CameraPath([
  // hook: crooked jets, then an extreme close-up of the clogged nozzles
  orbit(0, h(0, -0.35), 22, 6, 2.8, { fov: 38, stop: true }),
  orbit(2.6, h(0, -0.08), 14, -32, 1.35, { fov: 38 }),
  orbit(5.4, h(0, -0.15), 46, -4, 2.2, { fov: 38 }),
  // section view
  orbit(8.2, H, 86, 8, 1.9, { fov: 38 }),
  orbit(11.6, H, 90, 4, 1.45, { fov: 38 }),
  orbit(15.0, h(0, 0, -0.1), 92, 10, 1.15, { fov: 38 }),
  orbit(18.8, MAG, 82, 4, 1.25, { fov: 38 }),
  orbit(22.4, H, 84, 6, 1.45, { fov: 38 }),
  orbit(25.4, h(0, -0.3), 58, -8, 2.7, { fov: 38 }),
  // the person under the shower: aerosol into the lungs
  orbit(28.2, [0, 7.4, 0.5], 34, 4, 4.8, { fov: 38 }),
  orbit(31.2, [0, 7.15, 0.45], 26, 2, 3.2, { fov: 38 }),
  orbit(34.4, [0, 6.35, 0.15], 16, 2, 3.3, { fov: 38 }),
  orbit(38.2, [0, 6.8, 0.2], 28, 4, 4.6, { fov: 38 }),
  // surprise: mycobacteria in the biofilm
  orbit(41.4, h(0.2, -0.05), 64, 2, 2.4, { fov: 38 }),
  orbit(43.6, MAG, 74, 4, 1.25, { fov: 38 }),
  orbit(47.8, MAG, 66, 4, 1.35, { fov: 38 }),
  // the fix: rub the nozzles, descale, run hot water
  orbit(50.0, h(0, -0.1, 0.05), 32, -40, 1.05, { fov: 38 }),
  orbit(52.8, h(0, -0.06, 0.05), 20, -36, 1.0, { fov: 38 }),
  orbit(54.6, H, 80, 8, 1.6, { fov: 38 }),
  orbit(56.8, h(0, -0.3), 34, -6, 2.6, { fov: 38 }),
  orbit(60, h(0, -0.6), 24, -4, 3.6, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** water flowing (0 = off) */
export const water = (t: number) => (1 - ramp(t, 6.0, 6.8)) + envelope(t, 24.6, 25.2, 41.0, 41.6) + ramp(t, 55.4, 56.0);
/** hot water at the end */
export const hot = (t: number) => ramp(t, 55.4, 56.6);
/** chamber water level 0 (empty) .. 1 (full) */
export const level = (t: number) => Math.min(1, Math.max(water(t), 0.28 * ramp(t, 6.0, 7.0)));
/** state of the head: the hook shows the old head; the time-lapse starts clean at 6.8 s */
const old = (t: number) => 1 - ramp(t, 6.2, 7.0);
export const kalk = (t: number) => Math.max(old(t), ramp(t, 15.8, 17.8)) * (1 - 0.85 * ramp(t, 53.4, 55.4));
export const bio = (t: number) => Math.max(old(t), ramp(t, 18.1, 22.2)) * (1 - 0.7 * ramp(t, 50.4, 53.0)) * (1 - 0.5 * ramp(t, 53.4, 55.4));
export const clog = (t: number) => Math.max(old(t), ramp(t, 22.8, 25.0)) * (1 - ramp(t, 50.6, 52.8));
/** section cut through the head */
export const cut = (t: number) => envelope(t, 7.0, 8.2, 24.2, 25.2) + envelope(t, 53.0, 53.8, 55.2, 56.0);
export const weeks = (t: number) => ramp(t, 15.8, 25.0, (u) => u) * 6;
export const hudWeeks = (t: number) => envelope(t, 15.9, 16.5, 26.8, 27.4);
export const hudStudy = (t: number) => envelope(t, 42.6, 43.3, 48.6, 49.2);
export const magA = (t: number) => envelope(t, 18.6, 19.4, 22.3, 23.0);
export const magB = (t: number) => envelope(t, 42.6, 43.4, 48.4, 49.0);
export const person = (t: number) => envelope(t, 26.8, 28.2, 40.6, 41.6);
export const mist = (t: number) => envelope(t, 27.8, 29.6, 40.4, 41.6) + 0.8 * envelope(t, 56.0, 57.4, 60, 61);
export const inhale = (t: number) => envelope(t, 31.4, 32.4, 40.2, 41.0);
/** finger rubbing the rubber nozzles */
export const finger = (t: number) => envelope(t, 49.6, 50.3, 52.9, 53.5);
export const descale = (t: number) => envelope(t, 53.3, 53.9, 55.2, 55.8);

export const labels = {
  jet: (t: number) => envelope(t, 0.8, 1.2, 2.4, 2.8),
  dots: (t: number) => envelope(t, 3.0, 3.4, 5.6, 6.0),
  rest: (t: number) => envelope(t, 8.4, 8.8, 11.0, 11.4),
  climate: (t: number) => envelope(t, 11.6, 12.0, 15.0, 15.4),
  kalk: (t: number) => envelope(t, 16.0, 16.4, 18.0, 18.4),
  bio: (t: number) => envelope(t, 19.4, 19.8, 22.0, 22.4),
  clog: (t: number) => envelope(t, 23.0, 23.4, 26.8, 27.2),
  flakes: (t: number) => envelope(t, 28.6, 29.0, 30.6, 31.0),
  aerosol: (t: number) => envelope(t, 31.0, 31.4, 33.6, 34.0),
  lung: (t: number) => envelope(t, 34.0, 34.4, 36.0, 36.4),
  myco: (t: number) => envelope(t, 43.4, 43.8, 48.0, 48.4),
  rub: (t: number) => envelope(t, 50.4, 50.8, 52.8, 53.2),
  descale: (t: number) => envelope(t, 53.6, 54.0, 55.4, 55.8),
  hot: (t: number) => envelope(t, 56.2, 56.6, 59.2, 59.6),
};
