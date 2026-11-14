import type { ExplainerProject } from '../../engine/project';
import { MicrowaveModel } from './MicrowaveModel';
import { MicrowaveOverlay } from './MicrowaveOverlay';
import { MicrowaveScene } from './MicrowaveScene';
import { microwaveCamera, microwaveTimeline } from './script';

export const microwaveProject: ExplainerProject = {
  id: 'microwave',
  title: 'Wie funktioniert eine Mikrowelle?',
  timeline: microwaveTimeline,
  camera: microwaveCamera,
  Scene: MicrowaveScene,
  Overlay: MicrowaveOverlay,
  Model: MicrowaveModel,
  frameOffsetY: 180,
  post: { bloom: 0.9, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales Ersatzmodell. Wellen, Feldmuster und Moleküle sind stark verlangsamte, vereinfachte Visualisierungen (2,45 GHz, λ ≈ 12 cm). Das Feldmuster ist eine plausible Modenüberlagerung, keine Maxwell-Lösung; die Erwärmung ist ein vereinfachtes Modell (|E|² × Drehung + Wärmeleitung); Temperatur in Falschfarben.',
};
