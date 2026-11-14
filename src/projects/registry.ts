import type { ExplainerProject } from '../engine/project';
import { espressoProject } from './espresso';
import { kettleProject } from './kettle';
import { microwaveProject } from './microwave';

export const projects: Record<string, ExplainerProject> = {
  [kettleProject.id]: kettleProject,
  [espressoProject.id]: espressoProject,
  [microwaveProject.id]: microwaveProject,
};
export const defaultProjectId = kettleProject.id;
