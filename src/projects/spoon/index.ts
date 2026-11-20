import type { ExplainerProject } from '../../engine/project';
import { SpoonModel } from './SpoonModel';
import { SpoonOverlay } from './SpoonOverlay';
import { SpoonScene } from './SpoonScene';
import { spoonCamera, spoonTimeline } from './script';

export const spoonProject: ExplainerProject = {
  id: 'spoon',
  title: 'Der Riss im Holzlöffel',
  timeline: spoonTimeline,
  camera: spoonCamera,
  Scene: SpoonScene,
  Overlay: SpoonOverlay,
  Model: SpoonModel,
  frameOffsetY: 180,
  post: { bloom: 0.6, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales Modell. Holzblock, Gefäße, Riss und Bakterien stark vergrößert, Quellen/Schrumpfen übertrieben und im Zeitraffer. Hygiene-Aussage nach Versuchen mit Holzbrettchen (University of Wisconsin, 1990er): Bakterien werden in trocknendes Holz gezogen und sind danach meist nicht mehr nachweisbar.',
};
