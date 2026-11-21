import type { ExplainerProject } from '../../engine/project';
import { DishOverlay } from './DishOverlay';
import { DishScene } from './DishScene';
import { Machine } from './Machine';
import { dishCamera, dishTimeline } from './script';

export const dishwasherProject: ExplainerProject = {
  id: 'dishwasher',
  title: 'Wie funktioniert eine Spülmaschine?',
  timeline: dishTimeline,
  camera: dishCamera,
  Scene: DishScene,
  Overlay: DishOverlay,
  Model: Machine,
  frameOffsetY: 180,
  post: { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Schematisches 3D-Modell einer typischen Haushalts-Spülmaschine (Bauteile vereinfacht, Heizung als Durchlauferhitzer im Pumpenkreislauf). Ionen, Enzyme und Moleküle stark vergrößert. Wassermengen typisch: moderne Maschine ≈ 10 l pro Spülgang; Handabwasch derselben Menge oft deutlich mehr (Studien der Universität Bonn).',
};
