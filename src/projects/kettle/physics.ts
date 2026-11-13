/**
 * SIMPLIFIED heating model (lumped capacitance, analytical solution) — honest disclosure:
 *   m·c·dT/dt = η·P − k·(T − T_amb)
 * One well-mixed water temperature, no stratification, no CFD. Good enough to drive the
 * visualisation with physically plausible numbers (≈3¼ min for 1 l at 2 kW).
 */
export const KETTLE_PHYSICS = {
  powerW: 2000,
  efficiency: 0.92,
  waterKg: 1.0,
  cWater: 4186, // J/(kg·K)
  lossWPerK: 3,
  ambientC: 20,
  boilC: 100,
} as const;

const P = KETTLE_PHYSICS;
const tau = (P.waterKg * P.cWater) / P.lossWPerK; // s
const Tinf = (P.efficiency * P.powerW) / P.lossWPerK; // asymptotic rise over ambient

/** Water temperature after `s` seconds of real heating time. */
export function waterTempAt(s: number) {
  if (s <= 0) return P.ambientC;
  return Math.min(P.boilC, P.ambientC + Tinf * (1 - Math.exp(-s / tau)));
}

/** Real seconds needed to reach boiling. */
export const BOIL_SECONDS = -tau * Math.log(1 - (P.boilC - P.ambientC) / Tinf);
