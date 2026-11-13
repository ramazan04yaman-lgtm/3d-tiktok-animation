/**
 * Reference values used for the visualisation (typical household portafilter machine).
 * These are NOT simulated — they drive simplified, scripted animation tracks.
 */
export const ESPRESSO = {
  heaterW: 1350,
  brewPressureBar: 9, // ≈ 9 bar at the puck; vibration pumps are rated up to 15 bar
  brewTempC: 93,
  doseG: 18,
  shotMl: 36,
  shotSeconds: 25,
} as const;
