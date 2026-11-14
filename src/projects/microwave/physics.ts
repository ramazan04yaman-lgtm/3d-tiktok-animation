/**
 * Physics reference + the simplified field model used for the visualisation.
 *
 * - Magnetron output ≈ 800 W at f = 2.45 GHz → λ = c/f ≈ 12.2 cm (1.22 dm).
 * - Metal walls reflect the waves → standing waves. Hot spots are ≈ λ/2 ≈ 6 cm apart.
 * - Heating: water molecules are electric dipoles. In the alternating field they partly
 *   re-orient, but lag behind the field (they are hindered by hydrogen bonds/collisions).
 *   This lag means energy is absorbed and dissipated as heat ("dielectric loss",
 *   P ∝ 2π·f·ε₀·ε''·|E|²). They do NOT spin freely like propellers.
 * - Penetration depth in water-rich food at 2.45 GHz is only ~1–2 cm; the core warms by conduction.
 *
 * The cavity mode below is a plausible superposition, not a solved Maxwell problem.
 */
export const MW = {
  powerW: 800,
  frequencyGHz: 2.45,
  wavelengthDm: 1.22,
  turntableRpm: 6,
  cookSeconds: 120,
} as const;

/** Inner cavity (dm). Front opening at z = max[2]. */
export const CAVITY = { min: [-2.05, 0.2, -1.55] as [number, number, number], max: [0.85, 2.3, 1.5] as [number, number, number] };

const A = CAVITY.max[0] - CAVITY.min[0];
const D = CAVITY.max[2] - CAVITY.min[2];

/** Normalised |E|² of the (fixed) standing-wave pattern at height of the food, world x/z. */
export function fieldAt(x: number, z: number) {
  const u = (x - CAVITY.min[0]) / A;
  const v = (z - CAVITY.min[2]) / D;
  const m1 = Math.sin(5 * Math.PI * u) ** 2 * Math.sin(5 * Math.PI * v) ** 2;
  const m2 = Math.sin(4 * Math.PI * u + 0.6) ** 2 * Math.sin(6 * Math.PI * v + 0.3) ** 2;
  return (m1 + 0.6 * m2) / 1.6;
}

/** Same pattern as GLSL expression (x, z are floats in scope). */
export const FIELD_GLSL = `(pow(sin(5.0*3.14159265*((x-(${CAVITY.min[0].toFixed(3)}))/${A.toFixed(3)})),2.0)*pow(sin(5.0*3.14159265*((z-(${CAVITY.min[2].toFixed(3)}))/${D.toFixed(3)})),2.0)
 + 0.6*pow(sin(4.0*3.14159265*((x-(${CAVITY.min[0].toFixed(3)}))/${A.toFixed(3)})+0.6),2.0)*pow(sin(6.0*3.14159265*((z-(${CAVITY.min[2].toFixed(3)}))/${D.toFixed(3)})+0.3),2.0))/1.6`;
