import type { ExplainerProject } from '../../engine/project';
import { HeatingOverlay } from './HeatingOverlay';
import { HeatingScene } from './HeatingScene';
import { House } from './House';
import { heatingCamera, heatingTimeline } from './script';

export const heatingProject: ExplainerProject = {
  id: 'heating',
  title: 'Wie funktioniert eine Heizung?',
  timeline: heatingTimeline,
  camera: heatingCamera,
  Scene: HeatingScene,
  Overlay: HeatingOverlay,
  Model: House,
  frameOffsetY: 180,
  post: { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Schematisches 3D-Modell einer Gas-Brennwerttherme mit Plattenheizkörper und Thermostatventil (Bauteile vereinfacht). Moleküle stark vergrößert. Thermostat-Skala typisch: Stufe 3 ≈ 20 °C, Stufe 5 ≈ 28 °C (je nach Hersteller leicht verschieden); das Ventil regelt proportional zur Abweichung vom Sollwert.',
};
