import type { ExplainerProject } from '../../engine/project';
import { Brain } from './Brain';
import { BrainOverlay } from './BrainOverlay';
import { BrainScene } from './BrainScene';
import { brainCamera, brainTimeline } from './script';

export const brainProject: ExplainerProject = {
  id: 'brain',
  title: 'Wie funktioniert das Gehirn?',
  timeline: brainTimeline,
  camera: brainCamera,
  Scene: BrainScene,
  Overlay: BrainOverlay,
  Model: Brain,
  frameOffsetY: 180,
  post: { bloom: 0.8, bloomThreshold: 0.9, vignette: 0.55 },
  disclaimer:
    'Schematisches 3D-Modell (Gehirn mit Windungen, stark vereinfachtes Nervenzell-Netz; Zellen, Synapse und Moleküle stark vergrößert, Zeitabläufe verlangsamt). Zahlen: ≈ 86 Mrd. Nervenzellen, ≈ 20 W, Leitungsgeschwindigkeit bis ≈ 120 m/s (≈ 430 km/h), bis zu ≈ 10 000 Synapsen pro Zelle. Hirngewebe hat keine Nozizeptoren; Kopfhaut, Knochenhaut und Hirnhäute schon (Wach-Kraniotomie).',
};
