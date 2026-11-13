import { CameraPath, orbit } from '../../engine/camera';
import { Timeline } from '../../engine/timeline';
import { Ease, envelope, piecewise, ramp, smoothstep } from '../../engine/math';
import { BOIL_SECONDS, waterTempAt } from './physics';

/** All times in seconds of video. Change numbers here to re-time the whole video. */
export const T = {
  switchOn: 7.0,
  cutStart: 11.5,
  cutEnd: 14.0,
  explodeIn: [19.0, 21.0] as const,
  explodeOut: [25.5, 27.5] as const,
  boil: 44.0, // video time at which the water reaches 100 °C
  ductSteam: 46.5,
  switchOff: 53.5,
  outro: 56.5,
};

export const kettleTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 5, title: 'Der Wasserkocher' },
    { id: 'approach', start: 5, end: 11, title: 'Kamerafahrt & Einschalten' },
    { id: 'cutaway', start: 11, end: 18, title: 'Technische Schnittansicht' },
    { id: 'element', start: 18, end: 27, title: 'Das Heizelement' },
    { id: 'heating', start: 27, end: 38, title: 'Erwärmung des Wassers' },
    { id: 'bubbles', start: 38, end: 45, title: 'Aufsteigende Blasen' },
    { id: 'steam', start: 45, end: 51, title: 'Dampf' },
    { id: 'thermostat', start: 51, end: 60, title: 'Thermoschalter & Abschaltung' },
  ],
  captions: [
    { start: 0.6, end: 5, text: 'Wie funktioniert ein Wasserkocher?', sub: 'In 60 Sekunden erklärt' },
    { start: 5.2, end: 11, text: 'Schalter drücken –', sub: 'der Stromkreis schließt sich' },
    { start: 11.2, end: 18, text: 'Ein Blick ins Innere', sub: 'Schnittansicht durch Gehäuse & Griff' },
    { start: 18.2, end: 22.6, text: 'Das Heizelement', sub: 'ein Widerstandsdraht in einem Metallrohr' },
    { start: 22.6, end: 27, text: '≈ 2000 Watt', sub: 'Strom wird direkt zu Wärme' },
    { start: 27.2, end: 32.6, text: 'Die Bodenplatte heizt das Wasser', sub: 'Wärme wird durch Kontakt übertragen' },
    { start: 32.6, end: 38, text: 'Warmes Wasser steigt auf', sub: 'Konvektion mischt den Inhalt' },
    { start: 38.2, end: 41.6, text: 'Erste Dampfblasen', sub: 'sie fallen im kühleren Wasser zusammen – es „rauscht“' },
    { start: 41.6, end: 45, text: '100 °C – das Wasser kocht', sub: 'Blasen erreichen die Oberfläche' },
    { start: 45.2, end: 51, text: 'Dampf steigt auf', sub: 'ein Teil strömt durch einen Kanal im Griff' },
    { start: 51.2, end: 56.4, text: 'Bimetall-Thermoschalter', sub: 'der heiße Dampf lässt die Scheibe umspringen' },
    { start: 56.4, end: 60, text: 'Klick – automatisch aus!', sub: 'Strom unterbrochen, Wasser fertig' },
  ],
});

/** Kettle-space camera. Units: 1 = 1 dm (10 cm). Spout points +X, handle −X. */
export const kettleCamera = new CameraPath([
  orbit(0, [0, 1.1, 0], 26, 12, 11.5, { fov: 38, stop: true }),
  orbit(5, [0, 1.05, 0], 18, 10, 8.8, { fov: 38 }),
  orbit(8.5, [-0.45, 0.9, 0], 6, 8, 6.6, { fov: 38 }),
  orbit(11, [-0.2, 1.0, 0], 10, 10, 6.6, { fov: 38 }),
  orbit(15, [0, 1.0, 0], 28, 14, 7.2, { fov: 38 }),
  orbit(18.5, [0, 0.95, 0], 22, 8, 7.4, { fov: 38 }),
  orbit(22.5, [0, 1.15, 0], 12, 6, 8.6, { fov: 38 }),
  orbit(26.5, [0, 1.0, 0], -14, 8, 7.4, { fov: 38 }),
  orbit(30, [0, 1.0, 0], -4, 10, 6.8, { fov: 38 }),
  orbit(37, [0, 1.0, 0], -22, 12, 6.4, { fov: 38 }),
  orbit(40.5, [0, 0.85, 0], 6, 6, 4.3, { fov: 38 }),
  orbit(44.5, [0.05, 0.95, 0], 16, 8, 4.6, { fov: 38 }),
  orbit(48, [0.35, 2.25, 0], 30, 16, 6.6, { fov: 38 }),
  orbit(51, [-0.6, 1.4, 0], -5, 8, 6.6, { fov: 38 }),
  orbit(53, [-0.95, 0.72, 0], -58, 16, 3.6, { fov: 38, stop: true }),
  orbit(56.3, [-0.9, 0.78, 0], -46, 14, 4.0, { fov: 38, stop: true }),
  orbit(60, [0, 1.1, 0], 22, 12, 11.5, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks: pure functions of video time t. Every visual parameter of the demo comes from here.
// ---------------------------------------------------------------------------------------------

/** Mapping video time → real heating time (the video is a time-lapse). */
const simKeys: [number, number][] = [
  [T.switchOn, 0],
  [27, 60],
  [38, 150],
  [T.boil, BOIL_SECONDS],
  [T.switchOff, BOIL_SECONDS + 32],
  [60, BOIL_SECONDS + 40],
];
export const simSeconds = (t: number) => piecewise(simKeys, t);
export const waterTemp = (t: number) => waterTempAt(simSeconds(t));

/** Electrical power on/off (switch closed). */
export const power = (t: number) => (t >= T.switchOn && t < T.switchOff ? 1 : 0);
export const current = (t: number) => ramp(t, T.switchOn, T.switchOn + 0.4) * (1 - ramp(t, T.switchOff, T.switchOff + 0.25));
/** Visual glow of the element (heats within ~3 s, cools over ~4 s). False-colour exaggeration. */
export const elementHeat = (t: number) => ramp(t, T.switchOn + 0.2, T.switchOn + 3.5, Ease.outCubic) * (1 - ramp(t, T.switchOff, T.switchOff + 4, Ease.outCubic));
/** Section cut 0..1 */
export const cut = (t: number) => ramp(t, T.cutStart, T.cutEnd) * (1 - ramp(t, 57.2, 59.6));
export const explode = (t: number) => envelope(t, T.explodeIn[0], T.explodeIn[1], T.explodeOut[0], T.explodeOut[1]);
/** Thermal false-colour overlay on the water */
export const thermalView = (t: number) => envelope(t, 27.0, 28.5, 44.0, 45.5);
export const convection = (t: number) => envelope(t, 28.5, 30, 38.0, 39.5);
export const heatRings = (t: number) => envelope(t, 19.5, 21, 30, 32) * elementHeat(t);

/** Fully developed boiling */
export const boiling = (t: number) => ramp(t, T.boil - 0.6, T.boil + 1.5) * (1 - ramp(t, T.switchOff + 0.3, T.switchOff + 4.5));
/** Nucleate boiling incl. subcooled phase (bubbles appear ≈ 70 °C+). */
export const bubbleIntensity = (t: number) => Math.max(smoothstep(68, 92, waterTemp(t)) * 0.45 * (t < T.switchOff ? 1 : 1 - ramp(t, T.switchOff, T.switchOff + 3)), boiling(t));
/** How far bubbles rise before condensing (fraction of water depth). */
export const bubbleReach = (t: number) => (t >= T.boil - 0.5 ? 1 : 0.08 + 0.8 * smoothstep(70, 100, waterTemp(t)) ** 2);
export const steam = (t: number) => Math.max(smoothstep(80, 99, waterTemp(t)) * 0.18 * (1 - ramp(t, T.switchOff, T.switchOff + 4)), boiling(t));
export const ductFlow = (t: number) => ramp(t, T.ductSteam, T.ductSteam + 1.2) * (1 - ramp(t, T.switchOff + 0.2, T.switchOff + 2.5));
/** Temperature of the bimetal disc 0..1 */
export const bimetalHeat = (t: number) => ramp(t, T.ductSteam + 0.8, T.switchOff, Ease.inOutSine) * (1 - ramp(t, T.switchOff + 1, 60) * 0.5);
/** Bimetal snap: 0 = dome up (cold), 1 = inverted (tripped). Fast but eased (≈5 frames). */
export const snap = (t: number) => ramp(t, T.switchOff - 0.08, T.switchOff + 0.08, Ease.inOutCubic);
/** Rocker switch: 0 = off, 1 = on */
export const switchPos = (t: number) => ramp(t, T.switchOn - 0.25, T.switchOn, Ease.inOutCubic) * (1 - ramp(t, T.switchOff, T.switchOff + 0.12, Ease.inOutCubic));
/** Surface ripple amplitude */
export const surfaceAgitation = (t: number) => Math.max(bubbleIntensity(t) * 0.35, boiling(t));

/** Label visibility windows */
export const labels = {
  switch: (t: number) => envelope(t, 7.4, 7.9, 10.4, 10.9),
  glass: (t: number) => envelope(t, 14.2, 14.7, 17.3, 17.8),
  duct: (t: number) => envelope(t, 15.0, 15.5, 17.3, 17.8),
  element: (t: number) => envelope(t, 21.2, 21.7, 26.0, 26.5),
  plate: (t: number) => envelope(t, 21.8, 22.3, 26.0, 26.5),
  contact: (t: number) => envelope(t, 22.4, 22.9, 26.0, 26.5),
  steamDuct: (t: number) => envelope(t, 48.6, 49.1, 50.6, 51.0),
  bimetal: (t: number) => envelope(t, 52.6, 53.0, 56.2, 56.6),
};
