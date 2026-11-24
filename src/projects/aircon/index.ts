import type { ExplainerProject } from '../../engine/project';
import { AirconOverlay } from './AirconOverlay';
import { AirconScene } from './AirconScene';
import { Units } from './Units';
import { airconCamera, airconTimeline } from './script';

export const airconProject: ExplainerProject = {
  id: 'aircon',
  title: 'Wie funktioniert eine Klimaanlage?',
  timeline: airconTimeline,
  camera: airconCamera,
  Scene: AirconScene,
  Overlay: AirconOverlay,
  Model: Units,
  frameOffsetY: 180,
  post: { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Schematisches 3D-Modell einer Split-Klimaanlage (Innen- und Außengerät, Bauteile vereinfacht, Expansionsventil im Außengerät). Temperaturen typisch: Verdampfer ≈ 5 °C, Gas nach dem Kompressor ≈ 70 °C. Historisch: Willis Carrier, 1902, Druckerei Sackett-Wilhelms in Brooklyn (Feuchteregelung für passgenauen Farbdruck).',
};
