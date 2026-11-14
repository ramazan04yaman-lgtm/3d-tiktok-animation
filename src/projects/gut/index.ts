import type { ExplainerProject } from '../../engine/project';
import { GutModel } from './GutModel';
import { GutOverlay } from './GutOverlay';
import { GutScene } from './GutScene';
import { gutCamera, gutTimeline } from './script';

export const gutProject: ExplainerProject = {
  id: 'gut',
  title: 'Warum und wie furzen Menschen?',
  timeline: gutTimeline,
  camera: gutCamera,
  Scene: GutScene,
  Overlay: GutOverlay,
  Model: GutModel,
  frameOffsetY: 180,
  post: { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales, anatomisch orientiertes Ersatzmodell (kein lizenzierter medizinischer Scan). Darm verkürzt dargestellt (Dünndarm real ≈ 5–6 m), Längsschnitt zur Sicht ins Innere. Bakterien, Moleküle und Gasblasen stark vergrößert; Darmbewegungen stark beschleunigt (real: Minuten bis Stunden).',
};
