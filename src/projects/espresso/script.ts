import { CameraPath, orbit } from '../../engine/camera';
import { Timeline } from '../../engine/timeline';
import { Ease, envelope, ramp } from '../../engine/math';

/**
 * Episode 2 of the series: "Wie funktioniert eine Kaffeemaschine?"
 * Portafilter espresso machine with vibration pump and thermoblock (very common household design).
 * All times in seconds of video. Units: 1 = 1 dm. Front of the machine faces +Z.
 */
export const T = {
  powerOn: 7.5,
  xrayIn: [11.5, 14.5] as const,
  brewButton: 18.8,
  pumpOn: 19.0,
  internalCutIn: [24.6, 26.0] as const,
  internalCutOut: [37.6, 38.8] as const,
  pressureUp: [25.0, 30.0] as const,
  heatFollow: [31.5, 35.5] as const,
  groupCutIn: [38.0, 39.4] as const,
  showerStart: 38.6,
  firstDrips: 44.4,
  streamStart: 45.2,
  pumpOff: 53.6,
  xrayOut: [53.0, 56.0] as const,
  groupCutOut: [53.0, 55.0] as const,
};

export const espressoTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 5, title: 'Die Kaffeemaschine' },
    { id: 'approach', start: 5, end: 11, title: 'Kamerafahrt & Einschalten' },
    { id: 'xray', start: 11, end: 17, title: 'Transparentes Gehäuse' },
    { id: 'tank', start: 17, end: 24, title: 'Wassertank & Zulauf' },
    { id: 'pump', start: 24, end: 31, title: 'Die Pumpe baut Druck auf' },
    { id: 'heating', start: 31, end: 38, title: 'Das Heizsystem' },
    { id: 'extraction', start: 38, end: 46, title: 'Durch das Kaffeepulver' },
    { id: 'pour', start: 46, end: 54, title: 'Kaffee läuft in die Tasse' },
    { id: 'cup', start: 54, end: 60, title: 'Frisch gebrüht' },
  ],
  captions: [
    { start: 0.6, end: 5, text: 'Wie funktioniert eine Kaffeemaschine?', sub: 'In 60 Sekunden erklärt' },
    { start: 5.2, end: 11, text: 'Einschalten –', sub: 'das Heizsystem wird vorgeheizt' },
    { start: 11.2, end: 17, text: 'Ein Blick ins Innere', sub: 'das Gehäuse wird transparent' },
    { start: 17.2, end: 24, text: 'Der Wassertank', sub: 'die Pumpe saugt frisches Wasser an' },
    { start: 24.2, end: 31, text: 'Die Pumpe baut Druck auf', sub: 'bis zu 9 bar – wie in 90 m Wassertiefe' },
    { start: 31.2, end: 38, text: 'Der Thermoblock', sub: 'erhitzt das Wasser im Durchlauf auf ≈ 93 °C' },
    { start: 38.2, end: 46, text: 'Durch das Kaffeepulver', sub: 'heißes Wasser löst Aromen und Öle' },
    { start: 46.2, end: 54, text: 'Der Kaffee läuft', sub: 'in ≈ 25 Sekunden ist der Espresso fertig' },
    { start: 54.2, end: 60, text: 'Frisch gebrüht', sub: 'mit goldener Crema' },
  ],
});

export const espressoCamera = new CameraPath([
  orbit(0, [-0.75, 1.5, 0], 24, 14, 13.8, { fov: 38, stop: true }),
  orbit(5, [-0.45, 1.5, 0.1], 16, 10, 11.5, { fov: 38 }),
  orbit(9, [-0.45, 2.15, 0.6], 6, 6, 7.4, { fov: 38 }),
  orbit(11, [-0.1, 1.85, 0.2], 12, 10, 9.6, { fov: 38 }),
  orbit(15, [0, 1.7, -0.4], 34, 15, 10.2, { fov: 38 }),
  orbit(18.5, [-0.5, 1.5, -1.0], -42, 12, 6.8, { fov: 38 }),
  orbit(23, [0.15, 0.9, -0.7], -14, 30, 5.6, { fov: 38 }),
  orbit(27.5, [0.4, 0.8, -0.55], 22, 8, 4.6, { fov: 38 }),
  orbit(29.8, [0.75, 2.55, 0.9], 12, 4, 3.6, { fov: 38 }),
  orbit(34, [0.95, 1.55, -0.55], 6, 6, 4.3, { fov: 38 }),
  orbit(37.5, [0.4, 1.95, 0.2], 10, 8, 5.4, { fov: 38 }),
  orbit(40.5, [0, 1.98, 0.45], 8, 5, 3.2, { fov: 38 }),
  orbit(44, [0, 1.85, 0.45], -10, 4, 3.1, { fov: 38 }),
  orbit(47.5, [0, 1.25, 0.45], 12, 6, 5.0, { fov: 38 }),
  orbit(51.5, [0, 1.05, 0.45], -8, 10, 4.4, { fov: 38 }),
  orbit(55, [0, 0.85, 0.45], 14, 24, 2.7, { fov: 38 }),
  orbit(60, [0, 0.8, 0.45], 22, 32, 2.05, { fov: 38, stop: true }),
]);

// ------------------------------------------------------------------------------------------
// Tracks (pure functions of video time t)
// ------------------------------------------------------------------------------------------
export const power = (t: number) => (t >= T.powerOn ? 1 : 0);
export const powerButton = (t: number) => envelope(t, T.powerOn - 0.2, T.powerOn - 0.05, T.powerOn + 0.05, T.powerOn + 0.25);
export const brewButton = (t: number) => envelope(t, T.brewButton - 0.2, T.brewButton - 0.05, T.brewButton + 0.05, T.brewButton + 0.25);
/** Thermoblock heating element glow (false colour exaggeration) */
export const blockHeat = (t: number) => ramp(t, T.powerOn + 0.2, T.powerOn + 4, Ease.outCubic) * (1 - 0.35 * ramp(t, T.pumpOff, 60));
/** Housing x-ray: 0 = solid, 1 = transparent */
export const xray = (t: number) => ramp(t, T.xrayIn[0], T.xrayIn[1]) * (1 - ramp(t, T.xrayOut[0], T.xrayOut[1]));
export const internalCut = (t: number) => envelope(t, T.internalCutIn[0], T.internalCutIn[1], T.internalCutOut[0], T.internalCutOut[1]);
export const groupCut = (t: number) => envelope(t, T.groupCutIn[0], T.groupCutIn[1], T.groupCutOut[0], T.groupCutOut[1]);
export const pumping = (t: number) => ramp(t, T.pumpOn, T.pumpOn + 0.5) * (1 - ramp(t, T.pumpOff, T.pumpOff + 0.4));
/** Pressure in bar (simplified: rises once the circuit is filled, holds ≈ 9 bar during extraction). */
export const pressure = (t: number) => 9 * ramp(t, T.pressureUp[0], T.pressureUp[1], Ease.inOutSine) * (1 - ramp(t, T.pumpOff, T.pumpOff + 0.9));
/** Temperature of the water we follow through the circuit (°C). */
export const followedTemp = (t: number) => 20 + 73 * ramp(t, T.heatFollow[0], T.heatFollow[1], Ease.inOutSine);
export const tankLevel = (t: number) => 2.6 - 0.12 * ramp(t, T.pumpOn, T.pumpOff, Ease.linear);
/** Hot water layer above the puck (0..1) and wetting front through the puck (0..1) */
export const showerFlow = (t: number) => ramp(t, T.showerStart, T.showerStart + 0.6) * (1 - ramp(t, T.pumpOff, T.pumpOff + 0.6));
export const waterLayer = (t: number) => ramp(t, T.showerStart + 0.3, T.showerStart + 2.2) * (1 - ramp(t, T.pumpOff + 0.2, T.pumpOff + 2.5));
export const wetting = (t: number) => ramp(t, T.showerStart + 0.8, T.firstDrips, Ease.inOutSine);
export const puckFlow = (t: number) => ramp(t, T.firstDrips - 1.2, T.firstDrips) * (1 - ramp(t, T.pumpOff, T.pumpOff + 1.2));
export const spoutDrips = (t: number) => envelope(t, T.firstDrips, T.firstDrips + 0.3, T.streamStart, T.streamStart + 0.5) + envelope(t, T.pumpOff + 0.3, T.pumpOff + 0.5, T.pumpOff + 1.6, T.pumpOff + 2.4) * 0.5;
export const stream = (t: number) => ramp(t, T.streamStart, T.streamStart + 0.8) * (1 - ramp(t, T.pumpOff + 0.1, T.pumpOff + 0.7, Ease.inCubic));
/** Cup fill 0..1 */
export const cupFill = (t: number) => ramp(t, T.streamStart + 0.2, T.pumpOff + 0.6, Ease.inOutSine);
/** Crema develops while filling and settles afterwards */
export const crema = (t: number) => ramp(t, T.streamStart + 1.5, T.pumpOff + 2.5, Ease.inOutSine);
export const cupSteam = (t: number) => ramp(t, T.streamStart + 2, T.pumpOff + 1.5) * 0.85;
export const pumpPiston = (t: number) => Math.sin(t * Math.PI * 2 * 2.4) * pumping(t); // slowed down ×20 for visibility

export const labels = {
  power: (t: number) => envelope(t, 7.7, 8.2, 10.4, 10.9),
  tank: (t: number) => envelope(t, 18.6, 19.1, 21.3, 21.8),
  pump: (t: number) => envelope(t, 22.0, 22.5, 28.2, 28.7),
  gauge: (t: number) => envelope(t, 29.0, 29.5, 30.9, 31.3),
  block: (t: number) => envelope(t, 32.6, 33.1, 37.2, 37.7),
  portafilter: (t: number) => envelope(t, 39.4, 39.9, 41.6, 42.1),
  shower: (t: number) => envelope(t, 40.6, 41.1, 45.3, 45.8),
  crema: (t: number) => envelope(t, 56.4, 56.9, 59.3, 59.8),
};
