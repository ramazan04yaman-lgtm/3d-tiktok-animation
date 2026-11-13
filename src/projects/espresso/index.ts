import type { ExplainerProject } from '../../engine/project';
import { EspressoModel } from './EspressoModel';
import { EspressoOverlay } from './EspressoOverlay';
import { EspressoScene } from './EspressoScene';
import { espressoCamera, espressoTimeline } from './script';

export const espressoProject: ExplainerProject = {
  id: 'espresso',
  title: 'Wie funktioniert eine Kaffeemaschine?',
  timeline: espressoTimeline,
  camera: espressoCamera,
  Scene: EspressoScene,
  Overlay: EspressoOverlay,
  Model: EspressoModel,
  frameOffsetY: 180,
  post: { bloom: 0.9, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales Ersatzmodell einer Siebträgermaschine (Vibrationspumpe + Thermoblock). Druck- und Temperaturverlauf sind vereinfachte Skript-Kurven; Wasser, Kaffee und Dampf sind deterministische Visualisierungen, keine Strömungssimulation; Glühen in Falschfarben; Pumpenkolben verlangsamt.',
};
