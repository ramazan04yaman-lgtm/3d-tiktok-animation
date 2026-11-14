import type { ExplainerProject } from '../../engine/project';
import { HeartModel } from './HeartModel';
import { HeartOverlay } from './HeartOverlay';
import { HeartScene } from './HeartScene';
import { heartCamera, heartTimeline } from './script';

export const heartProject: ExplainerProject = {
  id: 'heart',
  title: 'Wie funktioniert das menschliche Herz?',
  timeline: heartTimeline,
  camera: heartCamera,
  Scene: HeartScene,
  Overlay: HeartOverlay,
  Model: HeartModel,
  frameOffsetY: 180,
  post: { bloom: 0.8, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales, anatomisch orientiertes Ersatzmodell (kein lizenzierter medizinischer Scan). Vierkammer-Schnitt; Herzschlag in Echtzeit (60/min) mit typischen Phasen. Blutfluss als Partikel visualisiert, Blau/Rot ist ein Farbcode für sauerstoffarm/-reich (Blut ist in Wirklichkeit dunkel- bis hellrot). Gasaustausch stark vergrößert.',
};
