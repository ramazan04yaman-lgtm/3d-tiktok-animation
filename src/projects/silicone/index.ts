import type { ExplainerProject } from '../../engine/project';
import { Bathroom } from './Bathroom';
import { SiliconeOverlay } from './SiliconeOverlay';
import { SiliconeScene } from './SiliconeScene';
import { siliconeCamera, siliconeTimeline } from './script';

export const siliconeProject: ExplainerProject = {
  id: 'silicone',
  title: 'Richtig gemacht: Schimmel in der Silikonfuge',
  timeline: siliconeTimeline,
  camera: siliconeCamera,
  Scene: SiliconeScene,
  Overlay: SiliconeOverlay,
  Model: Bathroom,
  frameOffsetY: 120,
  post: { bloom: 0.25, bloomThreshold: 1.2, vignette: 0.25 },
  disclaimer:
    'Schematische 3D-Darstellung einer Duschwannen-Fuge (Schnitt stark vergrößert). Elastische Fugen gelten nach DIN 52460 als Wartungsfugen und müssen regelmäßig geprüft und erneuert werden.',
};
