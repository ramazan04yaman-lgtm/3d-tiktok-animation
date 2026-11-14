import type { ExplainerProject } from '../engine/project';
import { espressoProject } from './espresso';
import { heartProject } from './heart';
import { kettleProject } from './kettle';
import { microwaveProject } from './microwave';

export const projects: Record<string, ExplainerProject> = {
  [kettleProject.id]: kettleProject,
  [espressoProject.id]: espressoProject,
  [microwaveProject.id]: microwaveProject,
  [heartProject.id]: heartProject,
};
export const defaultProjectId = kettleProject.id;
