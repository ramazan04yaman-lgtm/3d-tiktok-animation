import { CameraPath, orbit } from '../../engine/camera';
import { Ease, envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { W } from './anatomy';

/**
 * Episode 5: "Warum und wie furzen Menschen?" — scene times follow the recorded narration.
 */
export const T = {
  skinXray: [5.0, 7.6] as const,
  cutIn: [12.6, 13.8] as const,
  air: [13.8, 19.4] as const,
  colon: 19.4,
  ferment: [22.4, 31.2] as const,
  smell: [31.2, 38.2] as const,
  peristalsis: [38.2, 43.8] as const,
  toRectum: [43.8, 46.6] as const,
  sample: [46.8, 50.6] as const,
  exit: [52.2, 56.0] as const,
  sound: [56.0, 58.6] as const,
  cutOut: [57.0, 59.0] as const,
};

export const gutTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 5, title: 'Darmgase' },
    { id: 'tract', start: 5, end: 13, title: 'Das Verdauungssystem' },
    { id: 'origin', start: 13, end: 25, title: 'Wie entsteht das Gas?' },
    { id: 'collect', start: 25, end: 38, title: 'Das Gas sammelt sich' },
    { id: 'exit', start: 38, end: 50, title: 'Der Weg nach draußen' },
    { id: 'sound', start: 50, end: 56, title: 'Woher kommt das Geräusch?' },
    { id: 'outro', start: 56, end: 60, title: 'Abschluss' },
  ],
  captions: [
    { start: 0.6, end: 5, text: 'Warum furzen wir?', sub: 'In 60 Sekunden erklärt' },
    { start: 5.2, end: 13, text: 'Der Verdauungsweg', sub: 'Magen · Dünndarm · Dickdarm · Enddarm' },
    { start: 13.6, end: 19.2, text: 'Verschluckte Luft', sub: 'beim Essen, Trinken und Sprechen' },
    { start: 19.2, end: 25.6, text: 'Bakterien im Dickdarm', sub: 'zersetzen unverdauliche Ballaststoffe' },
    { start: 25.6, end: 31.2, text: 'Fermentation', sub: 'dabei entstehen Wasserstoff, CO₂ und Methan' },
    { start: 31.2, end: 38.2, text: 'Meist geruchlos', sub: 'den Geruch machen Schwefelverbindungen' },
    { start: 38.2, end: 43.8, text: 'Darmbewegungen', sub: 'schieben das Gas Richtung Enddarm' },
    { start: 43.8, end: 50.6, text: 'Gas oder Stuhl?', sub: 'Nerven im Enddarm prüfen den Inhalt' },
    { start: 50.6, end: 56.0, text: 'Der Schließmuskel entspannt', sub: 'das Gas kann entweichen' },
    { start: 56.0, end: 60, text: 'Völlig normal', sub: '≈ 10–20 Mal am Tag' },
  ],
});

// ---------------------------------------------------------------------------------------------
// Camera (world units; model points via W())
const BELLY = W([0, 10.4, 0.6]);
export const heroTarget = (p: readonly number[]) => W(p);

export const gutCamera = new CameraPath([
  orbit(0, W([0, 11.4, 0.1]), 12, 4, 6.2, { fov: 38, stop: true }),
  orbit(5, W([0, 10.8, 0.2]), 6, 4, 5.6, { fov: 38 }),
  orbit(8.5, BELLY, -4, 6, 3.7, { fov: 38 }),
  orbit(12.6, W([0, 10.6, 0.4]), -8, 8, 3.4, { fov: 38 }),
  // swallowed air: oesophagus → stomach
  orbit(15.6, W([0.25, 12.0, 0.2]), -4, 10, 2.6, { fov: 38 }),
  orbit(19.0, W([0.0, 10.9, 0.3]), -10, 8, 2.9, { fov: 38 }),
  // caecum & ascending colon (fermentation)
  orbit(22.6, W([-0.75, 9.7, 0.3]), -18, 8, 2.0, { fov: 38 }),
  orbit(27.0, W([-0.7, 9.8, 0.3]), -10, 8, 1.95, { fov: 38 }),
  orbit(31.2, W([-0.62, 10.0, 0.32]), -6, 8, 2.1, { fov: 38 }),
  orbit(35.4, W([-0.5, 10.2, 0.35]), -2, 9, 2.3, { fov: 38 }),
  // transverse colon: peristalsis
  orbit(39.5, W([0.15, 10.6, 0.45]), 6, 10, 2.4, { fov: 38 }),
  orbit(43.4, W([0.75, 10.4, 0.2]), 18, 8, 2.6, { fov: 38 }),
  // down the descending/sigmoid colon to the rectum — camera swings to the side (sagittal section)
  orbit(46.6, W([0.2, 8.85, -0.3]), 62, 6, 2.0, { fov: 38 }),
  orbit(50.2, W([0.0, 8.5, -0.4]), 84, 4, 1.75, { fov: 38 }),
  orbit(53.6, W([0.0, 8.3, -0.45]), 90, 2, 1.6, { fov: 38 }),
  orbit(56.0, W([0.0, 8.25, -0.55]), 94, 2, 1.7, { fov: 38 }),
  // back to the full figure
  orbit(58.6, W([0, 9.6, 0]), 40, 4, 7.5, { fov: 38 }),
  orbit(60, W([0, 9.4, 0]), 30, 4, 8.8, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
export const skinXray = (t: number) => ramp(t, T.skinXray[0], T.skinXray[1]) * (1 - 0.25 * ramp(t, 58.4, 59.8));
export const bones = (t: number) => ramp(t, 5.8, 7.6) * (1 - 0.5 * ramp(t, 12, 14)) + 0.0;
export const context = (t: number) => ramp(t, 6.5, 8.5) * (1 - 0.6 * ramp(t, 12.6, 14));
/** longitudinal section of the tract */
export const cut = (t: number) => ramp(t, T.cutIn[0], T.cutIn[1], Ease.inOutSine) * (1 - ramp(t, T.cutOut[0], T.cutOut[1], Ease.inOutSine));

export const air = (t: number) => envelope(t, T.air[0], T.air[0] + 0.6, 24, 25);
export const chyme = (t: number) => ramp(t, 13.4, 14.4) * (1 - ramp(t, 57.5, 59));
export const ferment = (t: number) => envelope(t, T.ferment[0], T.ferment[0] + 0.9, T.smell[1] - 1.0, T.smell[1] - 0.2);
/** gas production in the colon (small bubbles) */
export const gasMake = (t: number) => ramp(t, 20.0, 23.0) * (1 - ramp(t, 44, 47));
export const smell = (t: number) => envelope(t, T.smell[0] + 1.8, T.smell[0] + 2.6, T.smell[1] - 0.4, T.smell[1] + 0.4);
export const peri = (t: number) => ramp(t, 24.0, 26.0) * 0.35 + envelope(t, T.peristalsis[0], T.peristalsis[0] + 1, T.toRectum[1], T.toRectum[1] + 1) * 0.55;
/** internal sphincter relaxation (sampling reflex, then during release) */
export const internal = (t: number) => envelope(t, T.sample[0], T.sample[0] + 0.7, T.sample[0] + 2.6, T.sample[0] + 3.4) * 0.8 + envelope(t, T.exit[0] - 0.3, T.exit[0] + 0.4, T.exit[1] - 0.6, T.exit[1] + 0.3);
/** external sphincter relaxation (voluntary) */
export const external = (t: number) => envelope(t, T.exit[0], T.exit[0] + 0.6, T.exit[1] - 0.6, T.exit[1] + 0.3);
export const nerves = (t: number) => envelope(t, T.sample[0] + 0.4, T.sample[0] + 1.0, T.sample[1] - 0.4, T.sample[1]);
/** gas leaving through the anal canal (0..1 progress of the hero pocket's volume) */
export const release = (t: number) => ramp(t, T.exit[0] + 0.4, T.exit[1] - 0.4, Ease.inOutSine);
export const vibration = (t: number) => envelope(t, T.exit[0] + 0.6, T.exit[0] + 1.0, T.exit[1] - 0.6, T.exit[1]) ;
export const sound = (t: number) => envelope(t, T.exit[0] + 0.6, T.exit[0] + 1.2, T.sound[1] - 1, T.sound[1]);
export const hud = (t: number) => envelope(t, 13.4, 14.2, 55.6, 56.4);

export const labels = {
  stomach: (t: number) => envelope(t, 8.6, 9.0, 12.4, 12.8),
  small: (t: number) => envelope(t, 9.4, 9.8, 12.4, 12.8),
  colon: (t: number) => envelope(t, 10.2, 10.6, 12.4, 12.8),
  rectum: (t: number) => envelope(t, 11.0, 11.4, 12.4, 12.8),
  esophagus: (t: number) => envelope(t, 14.4, 14.8, 17.0, 17.4),
  stomachAir: (t: number) => envelope(t, 16.4, 16.8, 19.0, 19.4),
  caecum: (t: number) => envelope(t, 20.0, 20.4, 22.4, 22.8),
  bacteria: (t: number) => envelope(t, 23.6, 24.0, 29.0, 29.4),
  fibre: (t: number) => envelope(t, 24.8, 25.2, 29.0, 29.4),
  gases: (t: number) => envelope(t, 27.4, 27.8, 33.6, 34.0),
  sulfur: (t: number) => envelope(t, 34.2, 34.6, 36.8, 37.2),
  waves: (t: number) => envelope(t, 39.0, 39.4, 43.2, 43.6),
  rectumIn: (t: number) => envelope(t, 45.4, 45.8, 47.6, 48.0),
  internalSph: (t: number) => envelope(t, 47.2, 47.6, 50.4, 50.8),
  nerves: (t: number) => envelope(t, 48.2, 48.6, 50.6, 51.0),
  externalSph: (t: number) => envelope(t, 51.4, 51.8, 54.0, 54.4),
  vibration: (t: number) => envelope(t, 54.2, 54.6, 56.4, 56.8),
};
