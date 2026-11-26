import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';

/**
 * "Richtig gemacht" #1: Schimmel in der Silikonfuge. Bright bathroom, 72 s.
 * World: 1 unit ≈ 10 cm. Back wall face z = 0, left wall face x = 0, shower tray rim at y = 1.2.
 * The joint runs along the back wall (y = 1.2, z ≈ 0). Times follow audio/silicone-voice.json.
 */
export const DURATION = 72;
export const T = {
  hook: [0, 8.9] as const,
  wrong: [8.9, 12.5] as const,
  err1: [12.5, 20.8] as const,
  err2: [20.8, 27.3] as const,
  cta: [27.3, 31.4] as const,
  cut: [31.4, 35.6] as const,
  clean: [35.6, 40.1] as const,
  rod: [40.1, 47.2] as const,
  seal: [47.2, 55.1] as const,
  wait: [55.1, 58.0] as const,
  care: [58.0, 62.1] as const,
  reveal: [62.1, DURATION] as const,
};

export const siliconeTimeline = new Timeline({
  duration: DURATION,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: T.wrong[0], title: 'Schwarze Fuge' },
    { id: 'wrong', start: T.wrong[0], end: T.cta[0], title: 'Die Fehler' },
    { id: 'cta', start: T.cta[0], end: T.cut[0], title: 'Die Fehler' },
    { id: 'right', start: T.cut[0], end: T.wait[0], title: 'So geht’s richtig' },
    { id: 'care', start: T.wait[0], end: T.reveal[0], title: 'Pflege' },
    { id: 'reveal', start: T.reveal[0], end: DURATION, title: 'Das Überraschende' },
  ],
  captions: [],
});

// ---------------------------------------------------------------------------------------------
export const RIM = 1.2;
export const JOINT = { x0: 0.6, x1: 8.6, y: RIM, z: 0 };
/** floating section block (magnified profile of the joint) */
export const BLOCK: Vec3 = [4.6, 3.4, 2.4];
const J: Vec3 = [4.5, 1.3, 0.12];
const WIDE: Vec3 = [4.5, 3.0, 3.0];

export const siliconeCamera = new CameraPath([
  // hook: mouldy joint, the sponge does nothing
  orbit(0, J, 18, 22, 3.2, { fov: 38, stop: true }),
  orbit(3.0, [4.0, 1.28, 0.1], 10, 20, 1.8, { fov: 38 }),
  // section: the mould grows into the silicone
  orbit(5.6, BLOCK, 8, 10, 6.6, { fov: 38 }),
  orbit(8.6, BLOCK, -6, 10, 6.2, { fov: 38 }),
  orbit(11.0, WIDE, 22, 18, 10.5, { fov: 38 }),
  // mistake 1: three-sided adhesion, tear, water behind
  orbit(13.8, BLOCK, 8, 10, 6.2, { fov: 38 }),
  orbit(17.0, BLOCK, 14, 8, 5.8, { fov: 38 }),
  orbit(20.0, BLOCK, 4, 10, 6.0, { fov: 38 }),
  // mistake 2: water and soap stay on the joint
  orbit(22.6, [4.0, 1.25, 0.25], 20, 28, 2.0, { fov: 38 }),
  orbit(25.6, [4.2, 1.25, 0.2], 8, 22, 1.6, { fov: 38 }),
  // CTA over the whole corner
  orbit(28.8, WIDE, 18, 16, 10.0, { fov: 38 }),
  // the right way: cut out, clean, dry
  orbit(31.8, [3.4, 1.3, 0.15], 24, 24, 2.4, { fov: 38 }),
  orbit(34.6, [5.2, 1.3, 0.15], 14, 22, 2.2, { fov: 38 }),
  orbit(37.6, J, 6, 20, 2.4, { fov: 38 }),
  // backing rod in the section: two-sided adhesion, the joint can stretch
  orbit(40.8, BLOCK, 8, 10, 6.2, { fov: 38 }),
  orbit(43.6, BLOCK, 12, 10, 6.2, { fov: 38 }),
  orbit(45.9, BLOCK, 16, 12, 6.6, { fov: 38 }),
  // tape, gun, smoothing, tape off
  orbit(48.4, [3.4, 1.3, 0.15], 20, 24, 2.4, { fov: 38 }),
  orbit(50.2, [5.0, 1.3, 0.15], 14, 22, 2.2, { fov: 38 }),
  orbit(53.0, [6.0, 1.3, 0.15], 10, 22, 2.0, { fov: 38 }),
  // wait 24 h, then care: squeegee + airing
  orbit(56.4, WIDE, 18, 18, 10.0, { fov: 38 }),
  orbit(59.2, [4.5, 4.2, 0.5], 12, 10, 7.0, { fov: 38 }),
  // reveal: a maintenance joint – it ages
  orbit(62.6, J, 16, 24, 2.4, { fov: 38 }),
  orbit(67.0, J, 6, 22, 2.0, { fov: 38 }),
  orbit(DURATION, J, 2, 22, 2.2, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** old joint: mould amount (0..1); removed by the cutter */
export const mouldOld = (t: number) => 0.7 + 0.3 * ramp(t, 25.2, 27.0);
export const sponge = (t: number) => envelope(t, 0.4, 0.8, 3.0, 3.4);
/** section block: visible + which state it shows */
export const block = (t: number) => envelope(t, 4.6, 5.6, 10.6, 11.4) + envelope(t, 13.0, 13.8, 20.6, 21.4) + envelope(t, 40.1, 40.9, 45.4, 46.0);
export const blockMode = (t: number): 'mould' | 'wrong' | 'right' => (t < 12 ? 'mould' : t < 30 ? 'wrong' : 'right');
export const hyphae = (t: number) => ramp(t, 5.8, 8.6);
export const drop = (t: number) => ramp(t, 16.8, 17.5);
export const tear = (t: number) => ramp(t, 17.0, 17.8);
export const behind = (t: number) => ramp(t, 18.9, 20.6);
/** right section: backing rod, silicone, flexing tray */
export const rodIn = (t: number) => ramp(t, 40.6, 41.8);
export const fillRight = (t: number) => ramp(t, 42.4, 43.4);
export const flex = (t: number) => (t > 44.0 && t < 45.3 ? 0.5 - 0.5 * Math.cos(((t - 44.0) / 1.3) * Math.PI * 2) : 0);
/** mistake 2 */
export const drops = (t: number) => ramp(t, 22.4, 23.4) * (1 - ramp(t, 31.0, 31.8));
export const soap = (t: number) => ramp(t, 23.0, 24.4) * (1 - ramp(t, 31.0, 31.8));
/** the right way */
export const cutter = (t: number) => envelope(t, 32.8, 33.2, 35.4, 35.8);
export const cut = (t: number) => ramp(t, 33.2, 35.4, (u) => u);
export const cloth = (t: number) => envelope(t, 35.6, 36.0, 38.4, 38.8);
export const rodMain = (t: number) => ramp(t, 41.0, 46.0, (u) => u);
export const tapeIn = (t: number) => ramp(t, 47.3, 48.5);
export const tapeOut = (t: number) => ramp(t, 53.4, 54.6);
export const gun = (t: number) => envelope(t, 48.6, 49.0, 50.6, 51.0);
export const bead = (t: number) => ramp(t, 48.8, 50.6, (u) => u);
export const smoother = (t: number) => envelope(t, 50.8, 51.2, 53.0, 53.4);
export const smooth = (t: number) => ramp(t, 51.0, 53.0, (u) => u);
export const squeegee = (t: number) => envelope(t, 58.2, 58.6, 61.4, 61.8);
export const air = (t: number) => envelope(t, 59.8, 60.4, 62.2, 63.0);
/** the new joint ages over the years (reveal) */
export const aging = (t: number) => ramp(t, 67.4, 70.6);
export const years = (t: number) => envelope(t, 66.6, 67.2, DURATION, DURATION + 1);

export const tags = {
  mould: (t: number) => envelope(t, 1.0, 1.4, 4.2, 4.6),
  hyphae: (t: number) => envelope(t, 6.6, 7.0, 10.2, 10.6),
  three: (t: number) => envelope(t, 14.2, 14.6, 16.8, 17.2),
  tears: (t: number) => envelope(t, 17.2, 17.6, 20.2, 20.6),
  water: (t: number) => envelope(t, 19.0, 19.4, 20.2, 20.6),
  soap: (t: number) => envelope(t, 22.6, 23.0, 24.8, 25.2),
  food: (t: number) => envelope(t, 25.4, 25.8, 26.9, 27.3),
  cutAll: (t: number) => envelope(t, 33.4, 33.8, 35.2, 35.6),
  alcohol: (t: number) => envelope(t, 36.6, 37.0, 38.2, 38.6),
  dry: (t: number) => envelope(t, 38.4, 38.8, 39.8, 40.2),
  rod: (t: number) => envelope(t, 41.0, 41.4, 45.0, 45.4),
  two: (t: number) => envelope(t, 43.4, 43.8, 45.0, 45.4),
  tape: (t: number) => envelope(t, 47.4, 47.8, 48.6, 49.0),
  sanitary: (t: number) => envelope(t, 48.8, 49.2, 50.6, 51.0),
  water2: (t: number) => envelope(t, 51.0, 51.4, 53.0, 53.4),
  tapeOff: (t: number) => envelope(t, 53.4, 53.8, 54.8, 55.2),
  h24: (t: number) => envelope(t, 55.4, 55.8, 57.6, 58.0),
  wipe: (t: number) => envelope(t, 59.2, 59.6, 61.4, 61.8),
  vent: (t: number) => envelope(t, 60.4, 60.8, 61.8, 62.2),
  maint: (t: number) => envelope(t, 63.8, 64.2, 68.2, 68.6),
  renew: (t: number) => envelope(t, 68.8, 69.2, DURATION, DURATION + 1),
};
export const verdictBad = (t: number) => envelope(t, 12.5, 12.9, 26.8, 27.3);
export const verdictGood = (t: number) => envelope(t, 31.4, 31.8, 57.6, 58.0);
