import type { ExplainerProject } from '../../engine/project';
import { ShowerHead } from './ShowerHead';
import { ShowerOverlay } from './ShowerOverlay';
import { ShowerScene } from './ShowerScene';
import { showerCamera, showerTimeline } from './script';

export const showerProject: ExplainerProject = {
  id: 'shower',
  title: 'Was wächst in deinem Duschkopf?',
  timeline: showerTimeline,
  camera: showerCamera,
  Scene: ShowerScene,
  Overlay: ShowerOverlay,
  Model: ShowerHead,
  frameOffsetY: 180,
  post: { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.55 },
  disclaimer:
    'Prozedurales Modell. Kalk, Biofilm und Bakterien stark vergrößert, Wachstum im Zeitraffer (real: Wochen). Gesundheitsrisiko durch Duschkopf-Aerosole betrifft vor allem Menschen mit geschwächtem Immunsystem. Studie: Feazel et al., PNAS 2009 — Mykobakterien in manchen Duschköpfen > 100-fach gegenüber Leitungswasser angereichert.',
};
