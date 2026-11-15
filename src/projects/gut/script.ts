import { CameraPath, orbit } from '../../engine/camera';
import { Ease, envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { W } from './anatomy';

/**
 * Episode 5: "Warum und wie furzen Menschen?" — scene times follow the recorded narration.
 */
export const T = {
  skinXray: [5.0, 7.6] as const,
  cutIn: [12.0, 12.9] as const,
  air: [12.6, 15.4] as const,
  colon: 15.2,
  ferment: [17.2, 26.6] as const,
  smell: [26.8, 32.4] as const,
  peristalsis: [32.2, 35.0] as const,
  toRectum: [35.0, 37.2] as const,
  sample: [37.2, 42.8] as const,
  exit: [43.0, 48.6] as const,
  sound: [46.0, 50.0] as const,
  surprise: [50.0, 56.4] as const,
  cutOut: [56.0, 58.0] as const,
};

export const gutTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 7.5, title: 'Darmgase' },
    { id: 'tract', start: 7.5, end: 12.5, title: 'Das Verdauungssystem' },
    { id: 'origin', start: 12.5, end: 26.6, title: 'Wie entsteht das Gas?' },
    { id: 'collect', start: 26.6, end: 36.4, title: 'Das Gas sammelt sich' },
    { id: 'exit', start: 36.4, end: 46.5, title: 'Der Weg nach draußen' },
    { id: 'sound', start: 46.5, end: 50, title: 'Woher kommt das Geräusch?' },
    { id: 'surprise', start: 50, end: 56.3, title: 'Das Verrückteste' },
    { id: 'outro', start: 56.3, end: 60, title: 'Abschluss' },
  ],
  captions: [
    { start: 0.3, end: 7.4, text: 'Bis zu 20 Mal am Tag', sub: '… und jedes Mal wird vorher geprüft' },
    { start: 7.6, end: 12.4, text: 'Der Verdauungsweg', sub: 'Magen · Dünndarm · Dickdarm · Enddarm' },
    { start: 12.5, end: 15.1, text: 'Verschluckte Luft', sub: 'ein kleiner Teil des Gases' },
    { start: 15.1, end: 22.0, text: 'Bakterien im Dickdarm', sub: 'zersetzen Ballaststoffe' },
    { start: 22.0, end: 26.6, text: 'Fermentation', sub: 'Wasserstoff · Kohlendioxid · Methan' },
    { start: 26.6, end: 32.4, text: 'Fast geruchlos', sub: 'den Geruch machen Schwefelverbindungen' },
    { start: 32.4, end: 36.4, text: 'Darmbewegungen', sub: 'schieben das Gas zum Enddarm' },
    { start: 36.4, end: 42.8, text: 'Gas oder Stuhl?', sub: 'Nerven prüfen den Inhalt' },
    { start: 42.8, end: 46.6, text: 'Der Schließmuskel entspannt', sub: 'das Gas entweicht' },
    { start: 46.6, end: 49.9, text: 'Das Geräusch', sub: 'schwingendes Gewebe am Ausgang' },
    { start: 50.0, end: 56.2, text: 'Das Verrückteste', sub: 'Darmgas gelangt ins Blut – und wird ausgeatmet' },
    { start: 56.4, end: 60, text: 'Völlig normal', sub: 'bis zu 20 Mal am Tag' },
  ],
});

// ---------------------------------------------------------------------------------------------
// Camera (world units; model points via W())
const BELLY = W([0, 10.4, 0.6]);
export const heroTarget = (p: readonly number[]) => W(p);

export const MAG: [number, number, number] = [-0.06, 4.6, 0.72];
export const gutCamera = new CameraPath([
  orbit(0, W([0, 11.3, 0.1]), 16, 4, 6.6, { fov: 38, stop: true }),
  orbit(3.2, W([0, 10.9, 0.2]), 8, 5, 5.0, { fov: 38 }),
  orbit(7.6, BELLY, -4, 6, 3.7, { fov: 38 }),
  orbit(11.6, W([0, 10.6, 0.4]), -8, 8, 3.4, { fov: 38 }),
  // swallowed air: oesophagus → stomach
  orbit(13.6, W([0.25, 12.0, 0.2]), -4, 10, 2.5, { fov: 38 }),
  orbit(15.6, W([0.0, 10.9, 0.3]), -10, 8, 2.9, { fov: 38 }),
  // caecum, then an extreme close-up into the magnifier (bacteria, molecules)
  orbit(18.2, W([-0.75, 9.7, 0.3]), -18, 8, 2.0, { fov: 38 }),
  orbit(21.0, MAG, -10, 4, 1.15, { fov: 38 }),
  orbit(24.8, MAG, -3, 3, 0.95, { fov: 38 }),
  orbit(28.2, [MAG[0] - 0.08, MAG[1] - 0.05, MAG[2] - 0.1], -6, 6, 1.5, { fov: 38 }),
  orbit(31.2, W([-0.4, 10.3, 0.35]), -2, 9, 2.3, { fov: 38 }),
  // transverse colon: peristalsis, then down to the rectum (camera swings to the side)
  orbit(33.6, W([0.1, 10.6, 0.42]), 4, 10, 2.4, { fov: 38 }),
  orbit(35.6, W([0.75, 10.2, 0.2]), 22, 8, 2.5, { fov: 38 }),
  orbit(37.8, W([0.1, 8.75, -0.35]), 70, 5, 1.9, { fov: 38 }),
  orbit(40.6, W([0.0, 8.4, -0.42]), 86, 3, 1.45, { fov: 38 }),
  // extreme close-up: sphincters
  orbit(43.6, W([0.0, 8.3, -0.45]), 90, 2, 1.2, { fov: 38 }),
  orbit(47.6, W([0.0, 8.25, -0.55]), 94, 2, 1.45, { fov: 38 }),
  // surprise: gas into the blood, up to the lungs, exhaled
  orbit(51.2, W([0, 11.2, 0.0]), 55, 6, 4.4, { fov: 38 }),
  orbit(54.2, W([0, 13.2, 0.1]), 32, 6, 5.2, { fov: 38 }),
  // full figure
  orbit(57.8, W([0, 9.8, 0]), 22, 4, 8.0, { fov: 38 }),
  orbit(60, W([0, 9.6, 0]), 16, 4, 8.8, { fov: 38, stop: true }),
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
export const gasMake = (t: number) => ramp(t, 15.5, 18.5) * (1 - ramp(t, 36, 39));
export const smell = (t: number) => envelope(t, T.smell[0] + 1.8, T.smell[0] + 2.6, T.smell[1] - 0.4, T.smell[1] + 0.4);
export const peri = (t: number) => ramp(t, 19.0, 21.0) * 0.35 + envelope(t, T.peristalsis[0], T.peristalsis[0] + 1, T.toRectum[1], T.toRectum[1] + 1) * 0.55;
/** internal sphincter relaxation (sampling reflex, then during release) */
export const internal = (t: number) => envelope(t, T.sample[0], T.sample[0] + 0.7, T.sample[0] + 4.6, T.sample[0] + 5.4) * 0.8 + envelope(t, T.exit[0] - 0.3, T.exit[0] + 0.4, T.exit[1] - 0.6, T.exit[1] + 0.3);
/** external sphincter relaxation (voluntary) */
export const external = (t: number) => envelope(t, T.exit[0], T.exit[0] + 0.6, T.exit[1] - 0.6, T.exit[1] + 0.3);
export const nerves = (t: number) => envelope(t, T.sample[0] + 0.4, T.sample[0] + 1.0, T.sample[1] - 0.4, T.sample[1]);
/** gas leaving through the anal canal (0..1 progress of the hero pocket's volume) */
export const release = (t: number) => ramp(t, T.exit[0] + 0.4, T.exit[1] - 0.4, Ease.inOutSine);
export const vibration = (t: number) => envelope(t, T.exit[0] + 0.6, T.exit[0] + 1.0, T.exit[1] - 0.6, T.exit[1]) ;
export const sound = (t: number) => envelope(t, T.exit[0] + 0.6, T.exit[0] + 1.2, T.sound[1] - 1, T.sound[1]);
export const hud = (t: number) => envelope(t, 12.4, 13.2, 49.4, 50.2);
/** surprise: intestinal H₂ diffuses into the blood and is exhaled via the lungs */
export const absorb = (t: number) => envelope(t, T.surprise[0] + 0.6, T.surprise[0] + 1.6, T.surprise[1] - 0.6, T.surprise[1] + 0.6);
export const lungs = (t: number) => envelope(t, T.surprise[0] + 1.0, T.surprise[0] + 2.4, T.surprise[1] + 0.4, T.surprise[1] + 2.0);

export const labels = {
  stomach: (t: number) => envelope(t, 9.3, 9.6, 10.4, 10.8),
  small: (t: number) => envelope(t, 10.0, 10.3, 11.1, 11.5),
  colon: (t: number) => envelope(t, 10.8, 11.1, 11.8, 12.2),
  rectum: (t: number) => envelope(t, 11.5, 11.8, 12.4, 12.8),
  esophagus: (t: number) => envelope(t, 12.8, 13.2, 14.2, 14.6),
  stomachAir: (t: number) => envelope(t, 14.4, 14.8, 15.4, 15.8),
  caecum: (t: number) => envelope(t, 15.6, 16.0, 17.2, 17.6),
  bacteria: (t: number) => envelope(t, 17.8, 18.2, 20.6, 21.0),
  fibre: (t: number) => envelope(t, 19.6, 20.0, 21.6, 22.0),
  gases: (t: number) => envelope(t, 22.2, 22.6, 26.0, 26.4),
  sulfur: (t: number) => envelope(t, 29.6, 30.0, 31.8, 32.2),
  waves: (t: number) => envelope(t, 33.0, 33.4, 35.4, 35.8),
  rectumIn: (t: number) => envelope(t, 35.8, 36.2, 36.8, 37.2),
  internalSph: (t: number) => envelope(t, 37.4, 37.8, 39.6, 40.0),
  nerves: (t: number) => envelope(t, 39.6, 40.0, 42.2, 42.6),
  externalSph: (t: number) => envelope(t, 43.0, 43.4, 45.2, 45.6),
  vibration: (t: number) => envelope(t, 46.2, 46.6, 49.2, 49.6),
  blood: (t: number) => envelope(t, 51.4, 51.8, 53.6, 54.0),
  exhale: (t: number) => envelope(t, 54.2, 54.6, 55.8, 56.2),
};
