import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { BLOCK, BOWL } from './wood';

/** Episode 8: "Der Riss im Holzlöffel" — timed to audio/spoon-voice.json. */
export const spoonTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: 7.6, title: 'Der Holzlöffel' },
    { id: 'sponge', start: 7.6, end: 21.2, title: 'Holz ist ein Schwamm' },
    { id: 'crack', start: 21.2, end: 33.8, title: 'Der Riss' },
    { id: 'bacteria', start: 33.8, end: 41.8, title: 'Im Spalt' },
    { id: 'surprise', start: 41.8, end: 52.5, title: 'Das Überraschende' },
    { id: 'fix', start: 52.5, end: 60, title: 'So geht’s richtig' },
  ],
  captions: [
    { start: 0.3, end: 7.4, text: 'Die dunkle Linie', sub: 'ein Riss – und darin steckt mehr als Holz' },
    { start: 7.8, end: 14.2, text: 'Holz ist ein Schwamm', sub: 'winzige Röhren saugen Wasser und Fett auf' },
    { start: 14.4, end: 21.2, text: 'Quellen & Schrumpfen', sub: 'bis das Holz reißt' },
    { start: 21.3, end: 25.4, text: 'Essen im Riss', sub: 'Soße, Fleischsaft und Fett' },
    { start: 25.5, end: 33.8, text: 'Die Spülmaschine', sub: 'Hitze und Nässe – der Riss wird tiefer' },
    { start: 33.9, end: 41.8, text: 'Ideal für Bakterien', sub: 'Spülwasser erreicht sie kaum' },
    { start: 41.9, end: 52.4, text: 'Intaktes Holz ist hygienisch', sub: 'Bakterien sterben beim Trocknen meist ab' },
    { start: 52.6, end: 60, text: 'So geht’s richtig', sub: 'von Hand spülen · trocknen · Risse austauschen' },
  ],
});

const B: Vec3 = [BLOCK.x, BLOCK.y, BLOCK.z];
const b = (dx: number, dy: number, dz = 0): Vec3 => [BLOCK.x + dx, BLOCK.y + dy, BLOCK.z + dz];
const W: Vec3 = [BOWL.x, BOWL.y, BOWL.z + 0.1];
/** magnifier for the vessels (capillary uptake) */
export const MAGV: Vec3 = b(-0.95, 0.15, 0.35);

export const spoonCamera = new CameraPath([
  // hook: the dark line in the bowl, then an extreme close-up of the crack
  orbit(0, W, 18, 6, 3.2, { fov: 38, stop: true }),
  orbit(3.4, [0.06, 5.15, 0.12], 8, 4, 1.15, { fov: 38 }),
  orbit(6.6, [0.06, 5.15, 0.3], 14, 10, 1.4, { fov: 38 }),
  // magnified wood block
  orbit(9.0, B, 36, 22, 3.0, { fov: 38 }),
  orbit(11.4, MAGV, 20, 10, 1.35, { fov: 38 }),
  orbit(14.0, MAGV, 8, 8, 1.4, { fov: 38 }),
  orbit(16.6, B, 40, 20, 3.0, { fov: 38 }),
  orbit(20.6, b(0.4, 0.2), 52, 18, 2.2, { fov: 38 }),
  orbit(23.4, b(0.55, 0.25), 58, 24, 1.4, { fov: 38 }),
  orbit(27.0, B, 44, 22, 3.1, { fov: 38 }),
  orbit(31.4, B, 34, 20, 2.9, { fov: 38 }),
  // bacteria in the crack (extreme close-up)
  orbit(35.2, b(0.6, 0.2), 60, 22, 1.7, { fov: 38 }),
  orbit(39.4, b(0.6, 0.18), 50, 18, 1.5, { fov: 38 }),
  // intact wood: bacteria are pulled into the pores and die as it dries
  orbit(43.4, b(0.62, 0.1, -0.3), 70, 20, 1.5, { fov: 38 }),
  orbit(48.0, b(0.62, 0.1, -0.3), 80, 18, 1.3, { fov: 38 }),
  orbit(51.6, B, 40, 20, 3.0, { fov: 38 }),
  // back to the spoons
  orbit(54.6, [0.6, 4.2, 0.2], 18, 8, 6.6, { fov: 38 }),
  orbit(60, [0.6, 4.0, 0.1], 10, 6, 8.0, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
export const block = (t: number) => envelope(t, 7.6, 8.8, 52.0, 53.4);
export const spoonVis = (t: number) => 1 - block(t);
/** capillary uptake: water, then fat */
export const wet = (t: number) => ramp(t, 10.2, 12.4) * (1 - 0.6 * ramp(t, 17.3, 19.4)) + 0.6 * envelope(t, 26.2, 27.2, 33.0, 34.0);
export const fat = (t: number) => ramp(t, 12.2, 14.0) * 0.7 + ramp(t, 21.4, 25.0) * 0.3;
export const sauce = (t: number) => ramp(t, 21.4, 24.6);
/** swelling (+) / shrinking (−) of the block */
export const swell = (t: number) => {
  let s = 0.06 * envelope(t, 14.5, 16.2, 17.2, 18.6) - 0.04 * envelope(t, 17.6, 19.0, 20.6, 21.6);
  // dishwasher cycles
  if (t > 27.9 && t < 33.6) s += 0.05 * Math.sin(((t - 27.9) / 1.4) * Math.PI * 2) * Math.min(1, (t - 27.9) / 0.5, (33.6 - t) / 0.5);
  return s;
};
/** crack opening angle (rad per half) */
export const crack = (t: number) => 0.02 * ramp(t, 19.2, 20.8) + 0.05 * ramp(t, 20.6, 21.4) + 0.06 * ramp(t, 28.4, 33.4);
export const cycles = (t: number) => Math.min(5, Math.max(0, Math.floor((t - 27.9) / 1.15) + 1));
export const hudDish = (t: number) => envelope(t, 26.2, 26.8, 33.4, 34.0);
export const spray = (t: number) => envelope(t, 27.6, 28.2, 33.2, 33.8);
export const magV = (t: number) => envelope(t, 10.2, 11.0, 14.6, 15.4);
export const bacteria = (t: number) => ramp(t, 35.0, 39.0) * (1 - ramp(t, 41.4, 42.4));
export const rinse = (t: number) => envelope(t, 39.2, 39.8, 41.4, 42.0);
/** surprise: bacteria on intact wood are drawn in and die (dry) */
export const drawIn = (t: number) => ramp(t, 44.0, 47.6);
export const dry = (t: number) => ramp(t, 47.6, 51.4);
export const surfaceBugs = (t: number) => envelope(t, 42.6, 43.6, 51.4, 52.2);
/** end: the old cracked spoon steps back, a new spoon arrives */
export const swap = (t: number) => ramp(t, 56.4, 58.6);

export const labels = {
  line: (t: number) => envelope(t, 1.0, 1.4, 3.0, 3.4),
  crack: (t: number) => envelope(t, 3.4, 3.8, 6.8, 7.2),
  tubes: (t: number) => envelope(t, 10.8, 11.2, 14.2, 14.6),
  swell: (t: number) => envelope(t, 14.8, 15.2, 16.8, 17.2),
  shrink: (t: number) => envelope(t, 17.6, 18.0, 19.4, 19.8),
  breaks: (t: number) => envelope(t, 20.0, 20.4, 21.4, 21.8),
  food: (t: number) => envelope(t, 21.8, 22.2, 25.0, 25.4),
  deeper: (t: number) => envelope(t, 31.0, 31.4, 33.4, 33.8),
  bugs: (t: number) => envelope(t, 37.2, 37.6, 39.4, 39.8),
  rinse: (t: number) => envelope(t, 39.6, 40.0, 41.6, 42.0),
  pores: (t: number) => envelope(t, 44.0, 44.4, 47.4, 47.8),
  dies: (t: number) => envelope(t, 48.0, 48.4, 51.6, 52.0),
  hand: (t: number) => envelope(t, 53.0, 53.4, 55.4, 55.8),
  dryL: (t: number) => envelope(t, 55.8, 56.2, 57.2, 57.6),
  swap: (t: number) => envelope(t, 57.4, 57.8, 59.6, 60.2),
};
