import type { ExplainerProject } from '../engine/project';
import { kettleProject } from './kettle';

export const projects: Record<string, ExplainerProject> = {
  [kettleProject.id]: kettleProject,
};
export const defaultProjectId = kettleProject.id;
