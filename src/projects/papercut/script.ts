import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { Ease, envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { EDGE } from './finger';

/** Episode 6: "Warum schneidet Papier?" — timed to the Felix narration (audio/papercut-voice.json). */
export const papercutTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: 7.6, title: 'Papierschnitt' },
    { id: 'edge', start: 7.6, end: 16.8, title: 'Die Papierkante' },
    { id: 'pressure', start: 16.8, end: 27.5, title: 'Der Druck' },
    { id: 'skin', start: 27.5, end: 41.4, title: 'Die Haut' },
    { id: 'study', start: 41.4, end: 56.3, title: 'Die Studie' },
    { id: 'outro', start: 56.3, end: 60, title: 'Abschluss' },
  ],
  captions: [
    { start: 0.3, end: 7.4, text: 'So dünn wie ein Haar', sub: '… und trotzdem schneidet es' },
    { start: 7.9, end: 16.6, text: 'Die Papierkante', sub: 'Zellulosefasern – rau wie eine Säge' },
    { start: 17.0, end: 22.8, text: 'Kraft auf einer Linie', sub: 'hauchdünne Kante = riesiger Druck' },
    { start: 22.9, end: 27.6, text: 'Die Haut reißt auf', sub: 'die oberste Schicht wird durchtrennt' },
    { start: 27.8, end: 33.2, text: 'Ein flacher Schnitt', sub: 'kaum Blutgefäße – viele Nervenenden' },
    { start: 33.3, end: 41.2, text: 'Warum es so wehtut', sub: 'kaum Blut – die Nerven liegen offen' },
    { start: 41.6, end: 51.9, text: 'Studie: TU Dänemark, 2024', sub: '≈ 0,065 mm ist am gefährlichsten' },
    { start: 52.0, end: 56.2, text: 'Zu dünn knickt, zu dick drückt', sub: 'nur dazwischen schneidet es' },
    { start: 56.4, end: 60, text: 'Klein, aber gemein', sub: 'der Papierschnitt' },
  ],
});

const E: Vec3 = [EDGE.x, EDGE.y, EDGE.z];
export const RIG: Vec3 = [0, 2.9, -2.6];
const R = (dx: number, dy: number, dz = 0): Vec3 => [RIG[0] + dx, RIG[1] + dy, RIG[2] + dz];

export const papercutCamera = new CameraPath([
  // hook: extreme close-up of the edge sliding over the finger pad
  orbit(0, E, 28, 18, 2.1, { fov: 38, stop: true }),
  orbit(2.6, E, 32, 20, 2.6, { fov: 38 }),
  orbit(5.0, [0, 4.3, 0.4], 38, 14, 6.4, { fov: 38 }),
  orbit(7.6, [0, 4.5, 0.6], 22, 30, 4.8, { fov: 38 }),
  // dive onto the edge → microscope
  orbit(9.6, [0, 4.8, 0.84], 6, 55, 1.5, { fov: 38 }),
  orbit(12.8, [0, 4.8, 0.84], -6, 62, 1.1, { fov: 38 }),
  orbit(16.0, [0, 4.8, 0.84], 8, 52, 1.35, { fov: 38 }),
  // pressure
  orbit(18.4, [0, 4.6, 0.6], 34, 14, 4.2, { fov: 38 }),
  orbit(22.6, E, 30, 12, 2.4, { fov: 38 }),
  orbit(25.8, E, 24, 10, 1.6, { fov: 38 }),
  // skin section
  orbit(28.4, [0, 4.84, 0.8], 24, 22, 2.3, { fov: 38 }),
  orbit(31.6, [0.05, 4.8, 0.8], 14, 18, 1.9, { fov: 38 }),
  orbit(35.0, [0, 4.84, 0.8], 4, 16, 1.8, { fov: 38 }),
  orbit(38.6, [0, 4.92, 0.8], -8, 20, 1.45, { fov: 38 }),
  orbit(40.4, [0.05, 4.9, 0.8], -12, 20, 1.7, { fov: 38 }),
  // study rig
  orbit(42.0, [0, 3.7, -1.2], 2, 12, 5.6, { fov: 38 }),
  orbit(43.8, R(0, 0.5), 0, 12, 7.2, { fov: 38 }),
  orbit(48.2, R(0, 0.4), -6, 10, 6.4, { fov: 38 }),
  orbit(51.8, R(-0.85, 0.3), -12, 10, 3.0, { fov: 38 }),
  orbit(54.2, R(0.85, 0.3), 12, 10, 3.0, { fov: 38 }),
  // outro
  orbit(56.2, [0.3, 3.9, -0.8], 20, 12, 6.0, { fov: 38 }),
  orbit(57.6, [0, 4.4, 0.5], 30, 12, 6.0, { fov: 38 }),
  orbit(60, [0, 4.2, 0.4], 24, 10, 8.0, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** microscope view of the edge (cross-fade with the macro scene) */
export const micro = (t: number) => envelope(t, 8.6, 9.6, 16.3, 17.2);
/** skin section block */
export const block = (t: number) => envelope(t, 27.3, 28.3, 41.4, 42.0);
/** finger & sheet step aside while the study rig is shown */
const away = (t: number) => envelope(t, 40.0, 40.6, 56.4, 57.2);
export const fingerVis = (t: number) => Math.max(0, 1 - micro(t) - Math.max(block(t), away(t)));

/** x of the sheet (slides along its edge): fast in the hook, slow re-enactment in the pressure scene */
export const sheetX = (t: number) => (t < 9.8 ? 1.6 - 3.2 * ramp(t, 0.5, 2.5, Ease.inOutSine) : 1.6 - 3.2 * ramp(t, 17.4, 26.2, Ease.inOutSine));
export const press = (t: number) => envelope(t, 0.3, 0.7, 2.3, 2.8) + envelope(t, 17.4, 18.4, 25.8, 26.6);
/** sheet pulled away after the cut */
export const retract = (t: number) => ramp(t, 2.6, 3.6) * 0.8 * (1 - ramp(t, 16.4, 17.2)) + ramp(t, 26.2, 27.4) * 1.6 * (1 - ramp(t, 55.4, 56.6) * 0.5);
export const cut = (t: number) => ramp(t, 0.7, 2.2) * (1 - ramp(t, 9.8, 10.2)) + ramp(t, 22.9, 25.6);
export const open = (t: number) => ramp(t, 1.2, 3.0) * 0.7 * (1 - ramp(t, 9.8, 10.2)) + ramp(t, 24.5, 27.0) * 0.85;
export const line = (t: number) => envelope(t, 18.4, 19.2, 22.4, 23.0);
export const hud = (t: number) => envelope(t, 17.6, 18.3, 26.6, 27.3);

/** skin section highlights */
export const vessels = (t: number) => envelope(t, 29.4, 30.0, 31.6, 32.4) * 0.8 + 0.2 * block(t);
export const nerves = (t: number) => envelope(t, 31.4, 32.0, 40.6, 41.2);
export const pain = (t: number) => envelope(t, 37.6, 38.2, 40.6, 41.2);

/** study rig: the three sheets press down from 43.4 s */
export const rig = (t: number) => ramp(t, 39.6, 40.6) * (1 - ramp(t, 57.2, 58.2));
export const rigPress = (t: number) => ramp(t, 43.4, 46.2, Ease.inOutSine) * (1 - ramp(t, 56.0, 57.0));

export const labels = {
  edge: (t: number) => envelope(t, 11.8, 12.2, 14.6, 15.0),
  saw: (t: number) => envelope(t, 14.4, 14.8, 16.0, 16.4),
  lineL: (t: number) => envelope(t, 19.0, 19.4, 22.4, 22.8),
  shallow: (t: number) => envelope(t, 28.2, 28.6, 29.4, 29.8),
  vessels: (t: number) => envelope(t, 29.6, 30.0, 31.6, 32.0),
  nerves: (t: number) => envelope(t, 31.8, 32.2, 34.2, 34.6),
  tip: (t: number) => envelope(t, 34.6, 35.0, 37.2, 37.6),
  open: (t: number) => envelope(t, 37.8, 38.2, 40.6, 41.0),
  mid: (t: number) => envelope(t, 46.6, 47.0, 51.4, 51.8),
  thin: (t: number) => envelope(t, 52.0, 52.4, 53.8, 54.2),
  thick: (t: number) => envelope(t, 54.0, 54.4, 55.8, 56.2),
};
