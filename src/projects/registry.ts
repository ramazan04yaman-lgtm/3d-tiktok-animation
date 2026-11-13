import type { ExplainerProject } from '../engine/project';
import { espressoProject } from './espresso';
import { kettleProject } from './kettle';

export const projects: Record<string, ExplainerProject> = {
  [kettleProject.id]: kettleProject,
  [espressoProject.id]: espressoProject,
};
export const defaultProjectId = kettleProject.id;
