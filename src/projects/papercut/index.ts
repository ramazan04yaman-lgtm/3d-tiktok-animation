import type { ExplainerProject } from '../../engine/project';
import { PapercutModel } from './PapercutModel';
import { PapercutOverlay } from './PapercutOverlay';
import { PapercutScene } from './PapercutScene';
import { papercutCamera, papercutTimeline } from './script';

export const papercutProject: ExplainerProject = {
  id: 'papercut',
  title: 'Warum schneidet Papier?',
  timeline: papercutTimeline,
  camera: papercutCamera,
  Scene: PapercutScene,
  Overlay: PapercutOverlay,
  Model: PapercutModel,
  frameOffsetY: 180,
  post: { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales Modell. Papierfasern und Hautschnitt stark vergrößert, Papierdicken im Studienvergleich übertrieben dargestellt (Werte in den Beschriftungen). Druckwert vereinfacht: 1 N auf 1 cm Kante × 0,065 mm ≈ 15 bar. Studie: TU Dänemark (DTU), 2024 — ≈ 65 µm dickes Papier schneidet am leichtesten, dünneres knickt, dickeres drückt nur ein.',
};
