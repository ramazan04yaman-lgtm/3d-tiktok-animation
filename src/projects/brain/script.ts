import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';

/**
 * Episode 12: "Wie funktioniert das Gehirn?" World: brain ≈ 4 units long (1 unit ≈ 4 cm),
 * front of the brain at +x, left hemisphere towards the camera (+z).
 * The neuron network lives inside the left hemisphere (micro scale, camera dives in).
 * T holds the narration-driven times (audio/brain-voice.json).
 */
export const T = {
  hook: [0, 8.0] as const,
  neurons: [8.0, 14.5] as const,
  fire: [14.5, 22.2] as const,
  synapse: [22.2, 28.7] as const,
  cta: [28.8, 34.9] as const,
  chem: [34.9, 38.5] as const,
  conn: [38.5, 42.3] as const,
  learn: [42.3, 50.7] as const,
  reveal: [50.7, 60] as const,
};

export const brainTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: T.neurons[0], title: 'Das Gehirn' },
    { id: 'neurons', start: T.neurons[0], end: T.fire[0], title: 'Nervenzellen' },
    { id: 'fire', start: T.fire[0], end: T.synapse[0], title: 'Der Impuls' },
    { id: 'synapse', start: T.synapse[0], end: T.conn[0], title: 'Die Synapse' },
    { id: 'learn', start: T.conn[0], end: T.reveal[0], title: 'Lernen' },
    { id: 'reveal', start: T.reveal[0], end: 60, title: 'Das Überraschende' },
  ],
  captions: [
    { start: 0.3, end: 4.8, text: 'Nur 20 Watt', sub: 'weniger als eine Glühbirne' },
    { start: 4.9, end: T.neurons[0], text: 'Dein Gehirn', sub: 'steuert alles, was du bist' },
    { start: T.neurons[0] + 0.1, end: T.fire[0], text: '86 Milliarden', sub: 'Nervenzellen arbeiten zusammen' },
    { start: T.fire[0] + 0.1, end: T.synapse[0], text: 'Die Zelle feuert', sub: 'Stromimpuls bis 400 km/h' },
    { start: T.synapse[0] + 0.1, end: T.cta[0], text: 'Die Synapse', sub: 'ein winziger Spalt' },
    { start: T.cta[0], end: T.chem[0], text: 'Gleich wird’s verrückt', sub: 'was passiert im Spalt?' },
    { start: T.chem[0] + 0.1, end: T.conn[0], text: 'Aus Strom wird Chemie', sub: 'Botenstoffe wecken die nächste Zelle' },
    { start: T.conn[0] + 0.1, end: T.learn[0], text: 'Bis zu 10 000', sub: 'Verbindungen pro Zelle' },
    { start: T.learn[0] + 0.1, end: 47.5, text: 'So lernst du', sub: 'gemeinsam feuern → stärker verbunden' },
    { start: 47.6, end: T.reveal[0], text: 'Eine Erinnerung', sub: 'ist ein Muster aus Verbindungen' },
    { start: T.reveal[0] + 0.1, end: 60, text: 'Kein Schmerz', sub: 'das Hirngewebe hat keine Schmerzsensoren' },
  ],
});

// ---------------------------------------------------------------------------------------------
export const BRAIN_C: Vec3 = [0, 3.3, 0];
export const BULB: Vec3 = [0.4, 5.2, 0.4];
/** the two key neurons: A fires, its axon ends on a dendrite of B */
export const NA: Vec3 = [-0.45, 3.5, 0.6];
export const NB: Vec3 = [0.55, 3.27, 0.55];
/** axon terminal of A (synapse) */
export const SYN: Vec3 = [0.4, 3.3, 0.56];
export const MID: Vec3 = [0.05, 3.4, 0.58];
export const NET_C: Vec3 = [0.05, 3.4, 0.4];
export const LENS = {
  syn: [0.4, 3.36, 0.72] as Vec3,
  skin: [1.15, 5.35, 1.5] as Vec3,
};
export const LENS_R = { syn: 0.13, skin: 0.6 };

export const brainCamera = new CameraPath([
  // hook: brain next to a light bulb
  orbit(0, [0.1, 4.0, 0.2], 6, 6, 12.0, { fov: 38, stop: true }),
  orbit(3.6, [0.2, 3.9, 0.2], 14, 8, 10.6, { fov: 38 }),
  orbit(6.6, [0.3, 3.5, 0.6], 10, 10, 5.4, { fov: 38 }),
  // dive into the cortex
  orbit(8.8, [0.0, 3.45, 0.6], 8, 6, 2.4, { fov: 38 }),
  orbit(11.2, NA, 20, 8, 0.62, { fov: 38 }),
  orbit(14.0, NA, 34, 6, 0.5, { fov: 38 }),
  // impulse along the axon
  orbit(16.4, [-0.1, 3.45, 0.6], 12, 6, 0.66, { fov: 38 }),
  orbit(19.2, [0.25, 3.34, 0.57], 2, 6, 0.6, { fov: 38 }),
  // synapse
  orbit(22.4, SYN, 8, 4, 0.36, { fov: 38 }),
  orbit(25.6, SYN, -6, 4, 0.3, { fov: 38 }),
  orbit(28.8, SYN, 4, 6, 0.52, { fov: 38 }),
  orbit(31.8, SYN, -4, 6, 0.48, { fov: 38 }),
  // magnifier: transmitters cross the cleft
  orbit(35.0, LENS.syn, 4, 4, 0.62, { fov: 38 }),
  orbit(37.8, LENS.syn, -4, 4, 0.64, { fov: 38 }),
  // neuron B with thousands of synapses, then A + B learning, then the memory pattern
  orbit(40.2, NB, 24, 10, 0.9, { fov: 38 }),
  orbit(42.8, MID, 10, 8, 1.35, { fov: 38 }),
  orbit(46.0, MID, -4, 8, 1.3, { fov: 38 }),
  orbit(49.0, NET_C, 6, 8, 2.5, { fov: 38 }),
  // reveal: out of the brain, skull and the layer magnifier
  orbit(52.6, [0.7, 4.3, 0.9], 16, 12, 6.2, { fov: 38 }),
  orbit(56.2, LENS.skin, 8, 6, 2.4, { fov: 38 }),
  orbit(60, LENS.skin, 2, 6, 2.5, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** brain surface: solid → x-ray during the dive, solid again for the reveal */
export const brainXray = (t: number) => ramp(t, 7.4, 9.4) * (1 - ramp(t, 50.4, 52.4));
export const bulb = (t: number) => 1 - ramp(t, 6.8, 8.0);
/** the inner network glows while we are inside */
export const net = (t: number) => ramp(t, 7.6, 9.6) * (1 - ramp(t, 50.6, 52.0));
/** dendrite input pulses into A, then A fires */
export const inputs = (t: number) => envelope(t, 11.4, 12.0, 15.4, 15.8);
export const fireA = (t: number) => envelope(t, 15.0, 15.4, 16.2, 17.2);
/** impulse position along the axon (0..1) for the first spike */
export const spike = (t: number) => ramp(t, 15.6, 22.6, (u) => u);
export const hudSpeed = (t: number) => envelope(t, 16.0, 16.6, 22.0, 22.6);
export const speed = (t: number) => 400 * ramp(t, 16.2, 18.4);
/** synapse: the terminal glows when the spike arrives; vesicles fuse in the chemical part */
export const terminal = (t: number) => envelope(t, 22.4, 23.2, 34.4, 35.2) * (0.75 + 0.25 * Math.sin(t * 5));
export const lensSyn = (t: number) => envelope(t, T.chem[0] - 0.6, T.chem[0] + 0.4, T.chem[1] - 0.2, T.chem[1] + 0.5);
export const release = (t: number) => ramp(t, T.chem[0] + 0.4, T.chem[1] - 0.4);
/** synapse dots on B (connections) */
export const contacts = (t: number) => ramp(t, T.conn[0] + 0.2, T.conn[1] - 0.6) * (1 - ramp(t, 50.6, 51.6));
/** learning: co-firing pulses and connection strength */
export const PULSES = [42.6, 43.8, 45.0, 46.2];
export const strength = (t: number) => PULSES.reduce((s, p) => s + 0.25 * ramp(t, p + 0.5, p + 0.9), 0) * (1 - ramp(t, 50.6, 51.6));
export const pattern = (t: number) => ramp(t, 47.6, 49.2) * (1 - ramp(t, 50.4, 51.4));
/** reveal: skull and the layer magnifier */
export const skull = (t: number) => ramp(t, 51.0, 52.6);
export const lensSkin = (t: number) => ramp(t, 53.8, 55.0);
export const pain = (t: number) => ramp(t, 55.4, 56.4);

export const labels = {
  brain: (t: number) => envelope(t, 1.0, 1.4, 4.4, 4.8),
  bulb: (t: number) => envelope(t, 2.6, 3.0, 5.6, 6.0),
  neuron: (t: number) => envelope(t, 10.6, 11.0, 13.8, 14.2),
  dendrites: (t: number) => envelope(t, 12.0, 12.4, 14.4, 14.8),
  axon: (t: number) => envelope(t, 16.4, 16.8, 19.0, 19.4),
  myelin: (t: number) => envelope(t, 19.2, 19.6, 21.8, 22.2),
  synapse: (t: number) => envelope(t, 24.6, 25.0, 28.4, 28.8),
  vesicle: (t: number) => envelope(t, 35.4, 35.8, 38.0, 38.4),
  receptor: (t: number) => envelope(t, 36.6, 37.0, 38.2, 38.6),
  contacts: (t: number) => envelope(t, 39.4, 39.8, 42.0, 42.4),
  strong: (t: number) => envelope(t, 45.2, 45.6, 47.4, 47.8),
  scalp: (t: number) => envelope(t, 55.6, 56.0, 60, 61),
  tissue: (t: number) => envelope(t, 56.6, 57.0, 60, 61),
};
