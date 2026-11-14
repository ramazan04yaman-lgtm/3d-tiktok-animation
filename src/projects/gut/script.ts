import { CameraPath, orbit } from '../../engine/camera';
import { Ease, envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { W } from './anatomy';

/**
 * Episode 5: "Warum und wie furzen Menschen?" — scene times follow the recorded narration.
 */
export const T = {
  skinXray: [5.4, 7.8] as const,
  cutIn: [11.4, 12.4] as const,
  air: [12.2, 17.0] as const,
  colon: 16.4,
  ferment: [18.8, 28.6] as const,
  smell: [29.0, 34.4] as const,
  peristalsis: [34.4, 39.6] as const,
  toRectum: [39.6, 42.2] as const,
  sample: [42.4, 47.0] as const,
  exit: [47.6, 53.2] as const,
  sound: [50.4, 55.6] as const,
  cutOut: [56.0, 58.0] as const,
};

export const gutTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 6.2, title: 'Darmgase' },
    { id: 'tract', start: 6.2, end: 12, title: 'Das Verdauungssystem' },
    { id: 'origin', start: 12, end: 24, title: 'Wie entsteht das Gas?' },
    { id: 'collect', start: 24, end: 39.6, title: 'Das Gas sammelt sich' },
    { id: 'exit', start: 39.6, end: 50.5, title: 'Der Weg nach draußen' },
    { id: 'sound', start: 50.5, end: 55.6, title: 'Woher kommt das Geräusch?' },
    { id: 'outro', start: 55.6, end: 60, title: 'Abschluss' },
  ],
  captions: [
    { start: 0.4, end: 6.2, text: 'Bis zu 20 Mal am Tag', sub: '… und jedes Mal prüft dein Körper vorher' },
    { start: 6.3, end: 11.9, text: 'Der Verdauungsweg', sub: 'Magen · Dünndarm · Dickdarm · Enddarm' },
    { start: 12.0, end: 16.3, text: 'Verschluckte Luft', sub: 'beim Essen, Trinken und Sprechen' },
    { start: 16.3, end: 24.0, text: 'Bakterien im Dickdarm', sub: 'zersetzen unverdauliche Ballaststoffe' },
    { start: 24.0, end: 28.6, text: 'Fermentation', sub: 'dabei entstehen Wasserstoff, CO₂ und Methan' },
    { start: 28.6, end: 34.4, text: 'Meist geruchlos', sub: 'den Geruch machen Schwefelverbindungen' },
    { start: 34.4, end: 39.6, text: 'Darmbewegungen', sub: 'schieben das Gas Richtung Enddarm' },
    { start: 39.7, end: 41.9, text: 'Ab in den Enddarm', sub: 'dort sammelt sich das Gas' },
    { start: 41.9, end: 47.1, text: 'Gas oder Stuhl?', sub: 'Nerven im Enddarm prüfen den Inhalt' },
    { start: 47.1, end: 50.5, text: 'Der Schließmuskel entspannt', sub: 'das Gas kann entweichen' },
    { start: 50.6, end: 55.6, text: 'Woher kommt das Geräusch?', sub: 'das Gewebe am Ausgang schwingt' },
    { start: 55.7, end: 60, text: 'Völlig normal', sub: '≈ 10–20 Mal am Tag' },
  ],
});

// ---------------------------------------------------------------------------------------------
// Camera (world units; model points via W())
const BELLY = W([0, 10.4, 0.6]);
export const heroTarget = (p: readonly number[]) => W(p);

export const gutCamera = new CameraPath([
  orbit(0, W([0, 11.4, 0.1]), 12, 4, 6.2, { fov: 38, stop: true }),
  orbit(6.2, W([0, 10.8, 0.2]), 6, 4, 5.0, { fov: 38 }),
  orbit(8.8, BELLY, -4, 6, 3.7, { fov: 38 }),
  orbit(11.6, W([0, 10.6, 0.4]), -8, 8, 3.4, { fov: 38 }),
  // swallowed air: oesophagus → stomach
  orbit(14.2, W([0.25, 12.0, 0.2]), -4, 10, 2.6, { fov: 38 }),
  orbit(16.6, W([0.0, 10.9, 0.3]), -10, 8, 2.9, { fov: 38 }),
  // caecum & ascending colon (fermentation, smell)
  orbit(19.6, W([-0.75, 9.7, 0.3]), -18, 8, 2.0, { fov: 38 }),
  orbit(24.0, W([-0.7, 9.8, 0.3]), -10, 8, 1.95, { fov: 38 }),
  orbit(28.6, W([-0.62, 10.0, 0.32]), -6, 8, 2.1, { fov: 38 }),
  orbit(32.4, W([-0.5, 10.2, 0.35]), -2, 9, 2.3, { fov: 38 }),
  // transverse colon: peristalsis
  orbit(35.6, W([-0.2, 10.6, 0.4]), 0, 10, 2.5, { fov: 38 }),
  orbit(38.2, W([0.2, 10.6, 0.45]), 6, 10, 2.4, { fov: 38 }),
  orbit(40.2, W([0.75, 10.3, 0.2]), 20, 8, 2.6, { fov: 38 }),
  // down to the rectum — camera swings to the side (sagittal section)
  orbit(42.8, W([0.2, 8.85, -0.3]), 62, 6, 2.0, { fov: 38 }),
  orbit(46.0, W([0.0, 8.5, -0.4]), 84, 4, 1.75, { fov: 38 }),
  orbit(49.6, W([0.0, 8.3, -0.45]), 90, 2, 1.6, { fov: 38 }),
  orbit(54.2, W([0.0, 8.25, -0.55]), 94, 2, 1.7, { fov: 38 }),
  // back to the full figure
  orbit(57.8, W([0, 9.6, 0]), 40, 4, 7.5, { fov: 38 }),
  orbit(60, W([0, 9.4, 0]), 30, 4, 8.8, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
export const skinXray = (t: number) => ramp(t, T.skinXray[0], T.skinXray[1]) * (1 - 0.25 * ramp(t, 58.4, 59.8));
export const bones = (t: number) => ramp(t, 6.0, 7.8) * (1 - 0.5 * ramp(t, 11, 13));
export const context = (t: number) => ramp(t, 6.5, 8.5) * (1 - 0.6 * ramp(t, 11.4, 13));
/** longitudinal section of the tract */
export const cut = (t: number) => ramp(t, T.cutIn[0], T.cutIn[1], Ease.inOutSine) * (1 - ramp(t, T.cutOut[0], T.cutOut[1], Ease.inOutSine));

export const air = (t: number) => envelope(t, T.air[0], T.air[0] + 0.6, 24, 25);
export const chyme = (t: number) => ramp(t, 12.0, 13.0) * (1 - ramp(t, 57.5, 59));
export const ferment = (t: number) => envelope(t, T.ferment[0], T.ferment[0] + 0.9, T.smell[1] - 1.0, T.smell[1] - 0.2);
/** gas production in the colon (small bubbles) */
export const gasMake = (t: number) => ramp(t, 17.5, 20.5) * (1 - ramp(t, 41, 44));
export const smell = (t: number) => envelope(t, T.smell[0] + 1.8, T.smell[0] + 2.6, T.smell[1] - 0.4, T.smell[1] + 0.4);
export const peri = (t: number) => ramp(t, 21.0, 23.0) * 0.35 + envelope(t, T.peristalsis[0], T.peristalsis[0] + 1, T.toRectum[1], T.toRectum[1] + 1) * 0.55;
/** internal sphincter relaxation (sampling reflex, then during release) */
export const internal = (t: number) => envelope(t, T.sample[0], T.sample[0] + 0.7, T.sample[0] + 3.6, T.sample[0] + 4.4) * 0.8 + envelope(t, T.exit[0] - 0.3, T.exit[0] + 0.4, T.exit[1] - 0.6, T.exit[1] + 0.3);
/** external sphincter relaxation (voluntary) */
export const external = (t: number) => envelope(t, T.exit[0], T.exit[0] + 0.6, T.exit[1] - 0.6, T.exit[1] + 0.3);
export const nerves = (t: number) => envelope(t, T.sample[0] + 0.4, T.sample[0] + 1.0, T.sample[1] - 0.4, T.sample[1]);
/** gas leaving through the anal canal (0..1 progress of the hero pocket's volume) */
export const release = (t: number) => ramp(t, T.exit[0] + 0.4, T.exit[1] - 0.4, Ease.inOutSine);
export const vibration = (t: number) => envelope(t, T.exit[0] + 0.6, T.exit[0] + 1.0, T.exit[1] - 0.6, T.exit[1]) ;
export const sound = (t: number) => envelope(t, T.exit[0] + 0.6, T.exit[0] + 1.2, T.sound[1] - 1, T.sound[1]);
export const hud = (t: number) => envelope(t, 12.4, 13.2, 55.0, 55.8);

export const labels = {
  stomach: (t: number) => envelope(t, 8.1, 8.5, 11.4, 11.8),
  small: (t: number) => envelope(t, 8.9, 9.3, 11.4, 11.8),
  colon: (t: number) => envelope(t, 9.8, 10.2, 11.4, 11.8),
  rectum: (t: number) => envelope(t, 10.6, 11.0, 11.4, 11.8),
  esophagus: (t: number) => envelope(t, 12.6, 13.0, 15.2, 15.6),
  stomachAir: (t: number) => envelope(t, 14.6, 15.0, 16.6, 17.0),
  caecum: (t: number) => envelope(t, 16.9, 17.3, 18.8, 19.2),
  bacteria: (t: number) => envelope(t, 19.6, 20.0, 26.2, 26.6),
  fibre: (t: number) => envelope(t, 20.6, 21.0, 26.2, 26.6),
  gases: (t: number) => envelope(t, 24.4, 24.8, 30.2, 30.6),
  sulfur: (t: number) => envelope(t, 31.2, 31.6, 33.6, 34.0),
  waves: (t: number) => envelope(t, 35.0, 35.4, 38.8, 39.2),
  rectumIn: (t: number) => envelope(t, 39.9, 40.3, 41.8, 42.2),
  internalSph: (t: number) => envelope(t, 42.2, 42.6, 44.8, 45.2),
  nerves: (t: number) => envelope(t, 44.0, 44.4, 46.6, 47.0),
  externalSph: (t: number) => envelope(t, 47.4, 47.8, 49.8, 50.2),
  vibration: (t: number) => envelope(t, 50.8, 51.2, 54.4, 54.8),
};
