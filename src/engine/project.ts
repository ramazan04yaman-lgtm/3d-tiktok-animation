import type { ComponentType } from 'react';
import type { CameraPath } from './camera';
import type { Timeline } from './timeline';

/** Everything needed to produce one explainer video. */
export interface ExplainerProject {
  id: string;
  title: string;
  timeline: Timeline;
  camera: CameraPath;
  /** 3D content (inside the R3F canvas) */
  Scene: ComponentType;
  /** Static model only (no effects/labels) — used for the GLB export */
  Model?: ComponentType;
  /** HTML overlay (captions, HUD) — rendered on top of the canvas and captured by the exporter */
  Overlay?: ComponentType;
  /** Pixels to move the subject up on screen (room for captions) */
  frameOffsetY?: number;
  /** Post-processing tuning */
  post?: { bloom?: number; bloomThreshold?: number; vignette?: number };
  /** Honest note about simplifications, shown in README/overlay */
  disclaimer?: string;
}
