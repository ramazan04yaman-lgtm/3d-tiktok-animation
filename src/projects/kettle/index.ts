import type { ExplainerProject } from '../../engine/project';
import { KettleOverlay } from './KettleOverlay';
import { KettleScene } from './KettleScene';
import { KettleModel } from './KettleModel';
import { kettleCamera, kettleTimeline } from './script';

export const kettleProject: ExplainerProject = {
  id: 'kettle',
  title: 'Wie funktioniert ein Wasserkocher?',
  timeline: kettleTimeline,
  camera: kettleCamera,
  Scene: KettleScene,
  Overlay: KettleOverlay,
  Model: KettleModel,
  frameOffsetY: 180,
  post: { bloom: 0.9, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales Ersatzmodell. Erwärmung = vereinfachtes Wärmebilanzmodell (keine CFD); Blasen, Dampf und Konvektion sind deterministische Partikel-Visualisierungen; Glühen und Wasserfarbe sind Falschfarben.',
};
