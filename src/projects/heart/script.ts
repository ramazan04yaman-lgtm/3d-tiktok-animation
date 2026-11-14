import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { Ease, envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';
import { HEART, toWorld } from './anatomy';

/**
 * Episode 4: "Wie funktioniert das menschliche Herz?" — scene times exactly as specified.
 * The heart beats in real time (60 /min) throughout; the explanation highlights one path at a time.
 */
export const T = {
  approach: [0, 5] as const,
  skinXray: [5.4, 8.0] as const,
  ribsOut: [6.6, 9.0] as const,
  cutIn: [9.2, 10.6] as const,
  rightFlow: 13.2,
  rightDim: [24.6, 25.6] as const,
  pulmFlow: 25.2,
  lungsIn: [28.6, 30.4] as const,
  gas: [31.2, 36.8] as const,
  leftFlow: 37.2,
  aortaFlow: 48.2,
  bodyFlow: 51.6,
  cutOut: [53.4, 55.8] as const,
};

export const heartTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'intro', start: 0, end: 5, title: 'Das Herz' },
    { id: 'reveal', start: 5, end: 13, title: 'Das Herz sichtbar machen' },
    { id: 'right', start: 13, end: 25, title: 'Blut kommt zum Herzen' },
    { id: 'lungs', start: 25, end: 37, title: 'Blut zur Lunge' },
    { id: 'left', start: 37, end: 48, title: 'Sauerstoffreiches Blut' },
    { id: 'pump', start: 48, end: 56, title: 'Das Herz pumpt' },
    { id: 'outro', start: 56, end: 60, title: 'Abschluss' },
  ],
  captions: [
    { start: 0.6, end: 5, text: 'Wie funktioniert dein Herz?', sub: 'In 60 Sekunden erklärt' },
    { start: 5.2, end: 9.2, text: 'Der Blick in die Brust', sub: 'Das Herz liegt hinter dem Brustbein' },
    { start: 9.2, end: 13, text: 'Vier Kammern', sub: 'zwei Vorhöfe · zwei Herzkammern · vier Klappen' },
    { start: 13.2, end: 19.2, text: 'Sauerstoffarmes Blut', sub: 'kommt über die Hohlvenen zurück zum Herzen' },
    { start: 19.2, end: 25, text: 'In die rechte Herzkammer', sub: 'durch die Trikuspidalklappe' },
    { start: 25.2, end: 30.6, text: 'Ab in die Lunge', sub: 'über die Pulmonalklappe & Lungenarterie' },
    { start: 30.6, end: 37, text: 'Gasaustausch', sub: 'Kohlendioxid raus · Sauerstoff rein' },
    { start: 37.2, end: 43, text: 'Sauerstoffreiches Blut', sub: 'fließt über die Lungenvenen zum linken Vorhof' },
    { start: 43, end: 48, text: 'In die linke Herzkammer', sub: 'durch die Mitralklappe' },
    { start: 48.2, end: 52.4, text: 'Die linke Herzkammer', sub: 'die kräftigste Pumpe deines Körpers' },
    { start: 52.4, end: 56, text: 'Über die Aorta', sub: 'in den ganzen Körper' },
    { start: 56.2, end: 60, text: 'Ein Leben lang', sub: '≈ 100.000 Schläge – jeden Tag' },
  ],
});

// ---------------------------------------------------------------------------------------------
// Camera. Section view direction: the four-chamber plane faces az ≈ −12°, el ≈ 16°.
const H = (p: [number, number, number]): Vec3 => toWorld(p);
const HC: Vec3 = [HEART.position.x, HEART.position.y, HEART.position.z];
export const MAGNIFIER: [number, number, number] = [1.12, 4.55, 1.05];

export const heartCamera = new CameraPath([
  orbit(0, [0, 3.35, 0], 14, 5, 14.5, { fov: 38, stop: true }),
  orbit(5, [0.1, 3.85, 0.2], 6, 7, 8.6, { fov: 38 }),
  orbit(8.0, [0.18, 3.95, 0.3], -6, 13, 6.2, { fov: 38 }),
  orbit(10.6, HC, -12, 16, 4.5, { fov: 38 }),
  orbit(12.8, HC, -14, 16, 4.35, { fov: 38 }),
  // right heart (viewer's left)
  orbit(15.8, H([-0.3, 0.45, -0.05]), -20, 15, 3.8, { fov: 38 }),
  orbit(19.6, H([-0.25, 0.2, -0.05]), -14, 16, 3.4, { fov: 38 }),
  orbit(23.4, H([-0.2, 0.0, -0.05]), -8, 16, 3.6, { fov: 38 }),
  // outflow to the lungs
  orbit(26.8, H([0.05, 0.45, 0.1]), -2, 20, 3.8, { fov: 38 }),
  orbit(29.8, [0.05, 4.2, 0.0], 0, 10, 7.6, { fov: 38 }),
  orbit(32.6, [0.85, 4.42, 0.75], 6, 8, 4.6, { fov: 38 }),
  orbit(36.2, [0.85, 4.42, 0.75], 2, 8, 4.5, { fov: 38 }),
  // left heart (viewer's right)
  orbit(39.2, H([0.25, 0.45, -0.05]), -6, 16, 3.8, { fov: 38 }),
  orbit(42.8, H([0.17, 0.22, -0.05]), -12, 16, 3.4, { fov: 38 }),
  orbit(46.4, H([0.17, -0.08, -0.05]), -16, 14, 3.6, { fov: 38 }),
  // the pump
  orbit(49.6, H([0.12, 0.0, -0.05]), -20, 12, 3.3, { fov: 38 }),
  orbit(52.0, H([0.05, 0.42, -0.05]), -10, 16, 4.0, { fov: 38 }),
  orbit(55.4, [0.0, 3.6, 0.1], 6, 7, 10.6, { fov: 38 }),
  orbit(57.6, [0.05, 3.75, 0.15], 10, 7, 8.4, { fov: 38 }),
  orbit(60, [0.05, 3.75, 0.15], 16, 7, 8.8, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** skin: 0 = solid, 1 = x-ray */
export const skinXray = (t: number) => ramp(t, T.skinXray[0], T.skinXray[1]);
/** ribs/skeleton visibility (solid bone → faint ghost) */
export const ribs = (t: number) => 1 - ramp(t, T.ribsOut[0], T.ribsOut[1]);
export const ribsGhost = (t: number) => ramp(t, 6.0, 7.5) * (1 - 0.6 * ramp(t, 9, 10)) * (1 - ramp(t, 53, 55)) + ramp(t, 55, 57) * 0.35;
/** section cut: 0 = intact heart, 1 = four-chamber section */
export const cut = (t: number) => ramp(t, T.cutIn[0], T.cutIn[1], Ease.inOutSine) * (1 - ramp(t, T.cutOut[0], T.cutOut[1], Ease.inOutSine));
export const heartGhost = (t: number) => cut(t) * 0.85;
/** lungs: faint context, emphasised in the lung scene */
export const lungs = (t: number) => ramp(t, 6.0, 8.0) * 0.18 + envelope(t, T.lungsIn[0], T.lungsIn[1], 37.5, 39.5) * 0.62;
export const lungVessels = (t: number) => envelope(t, T.lungsIn[0], T.lungsIn[1], 41.0, 43.0);
/** systemic vessels in the trunk */
export const veinsBody = (t: number) => envelope(t, 12.6, 14.0, 18.5, 20.5) * 0.9 + ramp(t, 54, 56) * 0.5;
export const arteriesBody = (t: number) => ramp(t, T.bodyFlow - 0.8, T.bodyFlow + 0.8) * 0.95 - ramp(t, 57.5, 59.5) * 0.4;

/** blood-flow emphasis per path (1 = explained right now) */
const dim = 0.18;
export const flow = {
  caval: (t: number) => ramp(t, T.rightFlow, T.rightFlow + 0.8) * (1 - (1 - dim) * ramp(t, 19.5, 21)) * (1 - ramp(t, 53.6, 55)),
  tricuspid: (t: number) => ramp(t, 17.5, 18.5) * (1 - (1 - dim) * ramp(t, T.rightDim[0], T.rightDim[1])) * (1 - ramp(t, 53.6, 55)),
  pulmonary: (t: number) => ramp(t, T.pulmFlow, T.pulmFlow + 0.8) * (1 - (1 - dim) * ramp(t, 36.5, 37.5)) * (1 - ramp(t, 53.6, 55)),
  lungArt: (t: number) => envelope(t, 29.0, 30.0, 36.5, 37.5),
  lungVein: (t: number) => envelope(t, 35.0, 36.5, 41.5, 43.0),
  pvIn: (t: number) => ramp(t, T.leftFlow, T.leftFlow + 0.8) * (1 - (1 - dim) * ramp(t, 43, 44.5)) * (1 - ramp(t, 53.6, 55)),
  mitral: (t: number) => ramp(t, 41.5, 42.5) * (1 - (1 - dim) * ramp(t, 48.5, 49.5)) * (1 - ramp(t, 53.6, 55)),
  aortic: (t: number) => ramp(t, T.aortaFlow, T.aortaFlow + 0.8) * (1 - ramp(t, 55, 56.5)),
  body: (t: number) => ramp(t, T.bodyFlow, T.bodyFlow + 1.0) * (1 - 0.5 * ramp(t, 57.5, 59.5)),
};

/** gas-exchange magnifier */
export const gas = (t: number) => envelope(t, T.gas[0], T.gas[0] + 0.9, T.gas[1] - 0.8, T.gas[1]);
/** HUD (pulse, LV volume) */
export const hud = (t: number) => envelope(t, 12.4, 13.2, 55.4, 56.2);

export const labels = {
  vessels: (t: number) => envelope(t, 7.8, 8.2, 9.3, 9.7),
  ra: (t: number) => envelope(t, 10.3, 10.7, 12.0, 12.4),
  la: (t: number) => envelope(t, 10.5, 10.9, 12.0, 12.4),
  rv: (t: number) => envelope(t, 10.7, 11.1, 12.0, 12.4),
  lv: (t: number) => envelope(t, 10.9, 11.3, 12.0, 12.4),
  valves: (t: number) => envelope(t, 12.2, 12.6, 13.4, 13.8),
  svc: (t: number) => envelope(t, 14.0, 14.4, 17.0, 17.4),
  ivc: (t: number) => envelope(t, 14.6, 15.0, 17.4, 17.8),
  raIn: (t: number) => envelope(t, 17.6, 18.0, 20.0, 20.4),
  tricuspid: (t: number) => envelope(t, 20.2, 20.6, 22.6, 23.0),
  rvIn: (t: number) => envelope(t, 22.6, 23.0, 24.6, 25.0),
  pulmValve: (t: number) => envelope(t, 25.8, 26.2, 28.0, 28.4),
  pulmArtery: (t: number) => envelope(t, 27.0, 27.4, 29.2, 29.6),
  lung: (t: number) => envelope(t, 30.0, 30.4, 31.6, 32.0),
  co2: (t: number) => envelope(t, 32.4, 32.8, 36.0, 36.5),
  o2: (t: number) => envelope(t, 33.4, 33.8, 36.0, 36.5),
  pulmVeins: (t: number) => envelope(t, 38.0, 38.4, 40.4, 40.8),
  laIn: (t: number) => envelope(t, 40.6, 41.0, 43.0, 43.4),
  mitral: (t: number) => envelope(t, 43.4, 43.8, 45.6, 46.0),
  lvIn: (t: number) => envelope(t, 45.8, 46.2, 48.0, 48.4),
  wall: (t: number) => envelope(t, 48.8, 49.2, 50.8, 51.2),
  aorticValve: (t: number) => envelope(t, 50.8, 51.2, 52.4, 52.8),
  aorta: (t: number) => envelope(t, 52.2, 52.6, 54.2, 54.6),
};
