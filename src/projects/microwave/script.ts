import { CameraPath, orbit } from '../../engine/camera';
import { Timeline } from '../../engine/timeline';
import { Ease, envelope, ramp } from '../../engine/math';
import { MW } from './physics';

/**
 * Episode 3: "Wie funktioniert eine Mikrowelle?" — scene times exactly as specified.
 * Units: 1 = 1 dm. Door/front faces +Z. Cavity on the left, technics compartment on the right.
 */
export const T = {
  xrayIn: [6.0, 8.6] as const,
  powerOn: 12.0,
  magnetronCut: [12.3, 13.6] as const,
  electrons: 12.8,
  guideWave: [14.6, 17.0] as const, // wave travels from antenna through the waveguide
  frontsIn: 17.0,
  fieldIn: [22.5, 24.0] as const,
  molecules: [24.6, 33.4] as const,
  thermal: [31.0, 32.5] as const,
  powerOff: 50.0,
  xrayOut: [50.5, 53.5] as const,
  doorOpen: [53.6, 56.0] as const,
};

export const microwaveTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 5, title: 'Die Mikrowelle' },
    { id: 'inside', start: 5, end: 12, title: 'Das Innenleben' },
    { id: 'waves', start: 12, end: 22, title: 'Die Entstehung der Mikrowellen' },
    { id: 'heating', start: 22, end: 37, title: 'Das Essen wird warm' },
    { id: 'turntable', start: 37, end: 48, title: 'Der Drehteller' },
    { id: 'done', start: 48, end: 56, title: 'Die fertige Mahlzeit' },
    { id: 'outro', start: 56, end: 60, title: 'Abschluss' },
  ],
  captions: [
    { start: 0.6, end: 5, text: 'Wie erhitzt eine Mikrowelle dein Essen?', sub: 'In 60 Sekunden erklärt' },
    { start: 5.2, end: 12, text: 'Das Innenleben', sub: 'Magnetron · Hochspannung · Wellenleiter · Garraum' },
    { start: 12.2, end: 17, text: 'Das Magnetron', sub: 'erzeugt Mikrowellen mit 2,45 GHz' },
    { start: 17, end: 22, text: 'Über den Wellenleiter', sub: 'gelangen die Wellen in den Garraum' },
    { start: 22.2, end: 29.5, text: 'Ein elektrisches Wechselfeld', sub: 'Wassermoleküle sind Dipole und reagieren darauf' },
    { start: 29.5, end: 37, text: 'Energie wird zu Wärme', sub: 'durch dielektrische Verluste im Wasser' },
    { start: 37.2, end: 42.5, text: 'Der Drehteller', sub: 'dreht sich ≈ 6-mal pro Minute' },
    { start: 42.5, end: 48, text: 'Heiße und kühle Zonen', sub: 'das Essen wandert durch das Feldmuster' },
    { start: 48.2, end: 56, text: 'Fertig erhitzt', sub: 'ganz ohne heiße Herdplatte' },
    { start: 56.2, end: 60, text: 'Unsichtbare Wellen', sub: 'die dein Essen erwärmen' },
  ],
});

const BOWL: [number, number, number] = [-0.6, 0.55, 0];

export const microwaveCamera = new CameraPath([
  orbit(0, [-0.15, 1.3, 0], 22, 12, 21, { fov: 38, stop: true }),
  orbit(5, [-0.15, 1.3, 0], 17, 10, 17.5, { fov: 38 }),
  orbit(8.6, [0.05, 1.3, 0], 18, 12, 14.5, { fov: 38 }),
  orbit(11.6, [0.95, 1.35, 0], 24, 10, 8.6, { fov: 38 }),
  orbit(14.4, [1.3, 1.38, 0], 10, 6, 4.6, { fov: 38 }),
  orbit(17.4, [0.95, 1.65, 0], -4, 8, 5.4, { fov: 38 }),
  orbit(20.6, [-0.45, 1.3, 0], -2, 10, 8.6, { fov: 38 }),
  orbit(23.4, [-0.6, 0.85, 0], 6, 14, 5.4, { fov: 38 }),
  orbit(26.6, [-0.6, 1.2, 0.25], 0, 6, 3.3, { fov: 38 }),
  orbit(31, [-0.6, 1.0, 0.2], -10, 12, 3.8, { fov: 38 }),
  orbit(34.6, [-0.6, 0.6, 0], 0, 24, 4.0, { fov: 38 }),
  orbit(38.2, [-0.6, 0.42, 0], 22, 12, 4.2, { fov: 38 }),
  orbit(42.6, [-0.6, 0.45, 0], -22, 18, 4.4, { fov: 38 }),
  orbit(47.5, [-0.6, 0.55, 0], 0, 22, 4.4, { fov: 38 }),
  orbit(51, [-0.35, 1.2, 0], 10, 10, 10.5, { fov: 38 }),
  orbit(54.6, [-0.5, 1.0, 0.4], 14, 12, 11, { fov: 38 }),
  orbit(56.8, [-0.6, 0.65, 0.1], 8, 24, 4.8, { fov: 38 }),
  orbit(60, [-0.6, 0.6, 0], 0, 30, 3.7, { fov: 38, stop: true }),
]);

// ------------------------------------------------------------------------------------------
export const bowlCenter = BOWL;
export const power = (t: number) => (t >= T.powerOn && t < T.powerOff ? 1 : 0);
export const on = (t: number) => ramp(t, T.powerOn, T.powerOn + 0.4) * (1 - ramp(t, T.powerOff, T.powerOff + 0.4));
export const xray = (t: number) => ramp(t, T.xrayIn[0], T.xrayIn[1]) * (1 - ramp(t, T.xrayOut[0], T.xrayOut[1]));
/** cavity walls become see-through (partially) together with the housing */
export const cavityXray = (t: number) => xray(t) * 0.82;
export const magnetronCut = (t: number) => envelope(t, T.magnetronCut[0], T.magnetronCut[1], 21.0, 22.5);
export const electrons = (t: number) => ramp(t, T.electrons, T.electrons + 0.8) * (1 - ramp(t, T.powerOff, T.powerOff + 0.3)) * Math.max(magnetronCut(t), 0.0);
export const guideHead = (t: number) => ramp(t, T.guideWave[0], T.guideWave[1], Ease.linear);
export const guideWave = (t: number) => ramp(t, T.guideWave[0], T.guideWave[0] + 0.3) * (1 - ramp(t, 22.5, 24)) * on(t);
/** after the explanation, waves keep running faintly in the waveguide while cooking */
export const guideWaveFaint = (t: number) => ramp(t, 22.5, 24) * on(t) * 0.35 * xray(t);
export const fronts = (t: number) => ramp(t, T.frontsIn, T.frontsIn + 0.8) * (1 - 0.7 * ramp(t, 22.0, 24.0)) * on(t);
export const field = (t: number) => ramp(t, T.fieldIn[0], T.fieldIn[1]) * on(t) * (1 - 0.6 * envelope(t, T.molecules[0], T.molecules[0] + 0.6, T.molecules[1] - 0.6, T.molecules[1]));
export const molecules = (t: number) => envelope(t, T.molecules[0], T.molecules[0] + 0.9, T.molecules[1] - 0.8, T.molecules[1]);
/** visual field oscillation for the molecule view (Hz, hugely slowed down) */
export const E_VIS_HZ = 0.55;
export const fieldPhase = (t: number) => Math.cos(2 * Math.PI * E_VIS_HZ * t);
/** thermal agitation of molecules rises with temperature */
export const thermalView = (t: number) => envelope(t, T.thermal[0], T.thermal[1], 48.0, 49.5);
export const turntableAngle = (t: number) => {
  // rotates while the oven runs (constant 6 rpm with 0.3 s spin-up/down)
  const w = (MW.turntableRpm / 60) * Math.PI * 2;
  const a = Math.max(0, Math.min(t, T.powerOff) - T.powerOn);
  return a * w;
};
/** average food temperature (°C) */
export const foodTemp = (t: number) => 20 + 52 * ramp(t, T.powerOn + 2, T.powerOff, Ease.inOutSine);
/** simulated real cooking time remaining (s), shown on the display */
export const remaining = (t: number) => {
  if (t < T.powerOn) return 120;
  if (t >= T.powerOff) return 0;
  return 120 * (1 - (t - T.powerOn) / (T.powerOff - T.powerOn));
};
export const cavityLight = (t: number) => on(t) + ramp(t, T.doorOpen[0], T.doorOpen[0] + 0.3) * 0.9;
export const doorOpen = (t: number) => ramp(t, T.doorOpen[0], T.doorOpen[1], Ease.inOutSine);
export const steam = (t: number) => ramp(t, 38, 50) * 0.55 + ramp(t, 50, 53) * 0.35;
export const heatWires = (t: number) => on(t) * envelope(t, 7.5, 8.5, 21.0, 22.5);

export const labels = {
  doorMesh: (t: number) => envelope(t, 6.4, 6.8, 7.9, 8.3),
  cavity: (t: number) => envelope(t, 7.6, 8.0, 9.0, 9.4),
  turntable: (t: number) => envelope(t, 8.2, 8.6, 9.6, 10.0),
  magnetron: (t: number) => envelope(t, 9.4, 9.8, 11.4, 11.8),
  transformer: (t: number) => envelope(t, 10.0, 10.4, 11.6, 12.0),
  waveguide: (t: number) => envelope(t, 10.6, 11.0, 12.0, 12.4),
  cathode: (t: number) => envelope(t, 13.8, 14.2, 16.4, 16.8),
  freq: (t: number) => envelope(t, 17.6, 18.0, 20.3, 20.7),
  molecules: (t: number) => envelope(t, 26.0, 26.4, 29.2, 29.6),
  field: (t: number) => envelope(t, 29.7, 30.1, 33.0, 33.4),
  hotspots: (t: number) => envelope(t, 34.8, 35.2, 37.6, 38.0),
  turntable2: (t: number) => envelope(t, 38.6, 39.0, 41.8, 42.2),
};
