import { CameraPath, orbit, type Vec3 } from '../../engine/camera';
import { envelope, ramp } from '../../engine/math';
import { Timeline } from '../../engine/timeline';

/**
 * Episode 11: "Wie funktioniert eine Klimaanlage?" World: 1 unit ≈ 50 cm.
 * Exterior wall at x = 0 (room x < 0, outside x > 0), floor/ground y = 0.
 * T holds the narration-driven times (audio/aircon-voice.json).
 */
export const T = {
  hook: [0, 6.3] as const,
  loop: [6.3, 10.3] as const,
  indoor: [10.3, 15.0] as const,
  evap: [15.0, 21.2] as const,
  drain: [21.2, 26.1] as const,
  cta: [26.2, 30.9] as const,
  comp: [31.0, 37.2] as const,
  cond: [37.2, 43.6] as const,
  valve: [43.7, 49.6] as const,
  reveal: [49.7, 60] as const,
};

export const airconTimeline = new Timeline({
  duration: 60,
  fps: 30,
  scenes: [
    { id: 'hook', start: 0, end: T.loop[0], title: 'Die Klimaanlage' },
    { id: 'loop', start: T.loop[0], end: T.indoor[0], title: 'Der Kreislauf' },
    { id: 'indoor', start: T.indoor[0], end: T.cta[0], title: 'Drinnen' },
    { id: 'outdoor', start: T.cta[0], end: T.valve[0], title: 'Draußen' },
    { id: 'valve', start: T.valve[0], end: T.reveal[0], title: 'Das Ventil' },
    { id: 'reveal', start: T.reveal[0], end: 60, title: 'Das Überraschende' },
  ],
  captions: [
    { start: 0.3, end: T.loop[0] - 0.1, text: 'Macht sie Kälte?', sub: 'Nein – sie schiebt Wärme nach draußen' },
    { start: T.loop[0] + 0.1, end: T.indoor[0], text: 'Das Kältemittel', sub: 'kreist durch die Rohre' },
    { start: T.indoor[0] + 0.1, end: T.evap[0], text: 'Das Innengerät', sub: 'Lüfter saugt warme Luft an' },
    { start: T.evap[0] + 0.1, end: T.drain[0], text: 'Verdampfen kühlt', sub: 'wie Schweiß auf der Haut' },
    { start: T.drain[0] + 0.1, end: T.cta[0], text: 'Kondenswasser', sub: 'Luftfeuchte tropft heraus' },
    { start: T.cta[0], end: T.comp[0], text: 'Der Kreislauf', sub: 'innen Wärme rein, außen raus' },
    { start: T.comp[0] + 0.1, end: T.cond[0], text: 'Der Kompressor', sub: 'das Gas wird heiß – ≈ 70 °C' },
    { start: T.cond[0] + 0.1, end: T.valve[0], text: 'Der Verflüssiger', sub: 'Wärme raus, Gas wird flüssig' },
    { start: T.valve[0] + 0.1, end: T.reveal[0], text: 'Das Ventil', sub: 'Druck fällt – es wird eiskalt' },
    { start: T.reveal[0] + 0.1, end: 60, text: '1902: eine Druckerei', sub: 'erfunden gegen feuchtes Papier' },
  ],
});

// ---------------------------------------------------------------------------------------------
/** indoor unit (side section in x–y, long axis along z) */
export const IN = { x0: -0.64, x1: -0.15, y0: 3.85, y1: 4.6, z0: -0.9, z1: 0.9 };
export const FAN_IN: Vec3 = [-0.4, 4.08, 0];
/** outdoor unit on the ground outside */
export const OUT = { x0: 0.7, x1: 2.5, y0: 0.15, y1: 1.4, z0: -0.5, z1: 0.15 };
export const FAN_OUT: Vec3 = [1.82, 0.78, OUT.z1];
export const COMP: Vec3 = [0.95, 0.55, -0.2];
export const VALVE: Vec3 = [0.92, 1.12, -0.05];
/** old printing press (reveal) */
export const PRESS: Vec3 = [-2.4, 0, 0.3];
export const LENS = {
  evap: [-1.25, 3.55, 0.7] as Vec3,
  valve: [0.45, 1.85, 0.9] as Vec3,
};
export const LENS_R = { evap: 0.55, valve: 0.5 };

export const airconCamera = new CameraPath([
  // hook: the whole cut — room left, outside right, heat moves out
  orbit(0, [-0.3, 3.3, 0], 4, 6, 9.4, { fov: 38, stop: true }),
  orbit(3.6, [0.1, 2.8, 0], 8, 5, 9.2, { fov: 38 }),
  // refrigerant loop along the pipes
  orbit(6.8, [0.2, 2.7, 0], 30, 6, 7.4, { fov: 38 }),
  // indoor unit, extreme close-up of the section
  orbit(9.8, [-0.38, 4.2, 0.3], -24, 6, 3.2, { fov: 38 }),
  orbit(12.8, [-0.4, 4.2, 0.6], -14, 4, 2.1, { fov: 38 }),
  // evaporation magnifier
  orbit(16.2, LENS.evap, -8, 4, 3.1, { fov: 38 }),
  orbit(19.8, LENS.evap, -16, 4, 3.1, { fov: 38 }),
  // condensate: fins, tray, hose outside
  orbit(22.6, [-0.4, 4.0, 0.5], -20, 8, 2.5, { fov: 38 }),
  orbit(25.4, [0.3, 2.6, 0.2], 22, 6, 6.8, { fov: 38 }),
  // CTA over the whole loop
  orbit(28.6, [0.4, 2.5, 0], 16, 6, 9.4, { fov: 38 }),
  // outdoor unit: compressor, fan and condenser
  orbit(31.8, [1.5, 0.85, -0.15], 10, 10, 3.8, { fov: 38 }),
  orbit(34.8, [COMP[0], 0.7, COMP[2]], -28, 8, 2.2, { fov: 38 }),
  orbit(38.0, [1.65, 0.8, -0.15], 12, 8, 3.6, { fov: 38 }),
  orbit(41.4, [1.5, 0.95, -0.1], -8, 10, 4.3, { fov: 38 }),
  // expansion valve magnifier
  orbit(44.6, LENS.valve, 8, 4, 2.9, { fov: 38 }),
  orbit(48.0, LENS.valve, -4, 4, 3.0, { fov: 38 }),
  // reveal: the printing press of 1902
  orbit(51.2, [PRESS[0], 1.0, PRESS[2]], 20, 10, 4.6, { fov: 38 }),
  orbit(55.2, [PRESS[0], 1.0, PRESS[2]], 10, 8, 4.2, { fov: 38 }),
  orbit(60, [PRESS[0], 1.0, PRESS[2]], 4, 8, 4.4, { fov: 38, stop: true }),
]);

// ---------------------------------------------------------------------------------------------
// Tracks
/** machine running (air + refrigerant) */
export const run = (_t: number) => 1;
/** pipe insulation turns transparent to show the refrigerant */
export const pipeXray = (t: number) => ramp(t, 6.4, 7.6);
export const inXray = (t: number) => ramp(t, 9.4, 10.8);
export const outXray = (t: number) => ramp(t, 30.6, 32.0);
/** the indoor coil: frost + condensate */
export const wetFins = (t: number) => ramp(t, 21.4, 24.0);
export const drain = (t: number) => ramp(t, 22.6, 24.4);
export const lensEvap = (t: number) => envelope(t, T.evap[0] + 0.4, T.evap[0] + 1.4, T.evap[1] - 0.3, T.evap[1] + 0.4);
export const lensValve = (t: number) => envelope(t, T.valve[0] + 0.3, T.valve[0] + 1.3, T.valve[1] - 0.3, T.valve[1] + 0.4);
export const evap = (t: number) => ramp(t, T.evap[0] + 1.4, T.evap[1] - 0.8);
/** the press appears in the room for the reveal; the humidity drops when the machine dries the air */
export const press = (t: number) => ramp(t, 49.4, 50.6);
export const humidity = (t: number) => 85 - 40 * ramp(t, 53.6, 58.4);
/** temperatures shown in the HUD */
export const compTemp = (t: number) => 12 + 58 * ramp(t, 32.2, 36.6);
export const valveTemp = (t: number) => 40 - 35 * ramp(t, 46.2, 48.6);
export const hudComp = (t: number) => envelope(t, 31.6, 32.2, T.cond[0] + 0.4, T.cond[0] + 1.0);
export const hudValve = (t: number) => envelope(t, T.valve[0] + 1.0, T.valve[0] + 1.6, T.valve[1] - 0.2, T.valve[1] + 0.4);
export const hudHum = (t: number) => envelope(t, 51.6, 52.2, 60, 61);

export const labels = {
  heat: (t: number) => envelope(t, 3.4, 3.8, 6.0, 6.4),
  refrig: (t: number) => envelope(t, 7.6, 8.0, 10.0, 10.4),
  fan: (t: number) => envelope(t, 11.0, 11.4, 13.2, 13.6),
  fins: (t: number) => envelope(t, 13.0, 13.4, 15.0, 15.4),
  evap: (t: number) => envelope(t, 16.8, 17.2, 20.6, 21.0),
  water: (t: number) => envelope(t, 22.4, 22.8, 25.6, 26.0),
  comp: (t: number) => envelope(t, 32.0, 32.4, 36.6, 37.0),
  fanOut: (t: number) => envelope(t, 37.8, 38.2, 40.2, 40.6),
  cond: (t: number) => envelope(t, 40.4, 40.8, 43.2, 43.6),
  valve: (t: number) => envelope(t, 45.2, 45.6, 49.0, 49.4),
  press: (t: number) => envelope(t, 51.4, 51.8, 55.2, 55.6),
  carrier: (t: number) => envelope(t, 55.6, 56.0, 60, 61),
};
/** compressor glow (hot discharge) */
export const ramp01 = (t: number) => ramp(t, 32.0, 36.0);
/** close-ups where the air streams would block the view */
export const inClose = (t: number) => envelope(t, 9.4, 10.4, 25.0, 26.0);
export const outClose = (t: number) => envelope(t, 31.0, 32.0, 37.6, 38.6);
