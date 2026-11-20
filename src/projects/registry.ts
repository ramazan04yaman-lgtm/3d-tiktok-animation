import type { ExplainerProject } from '../engine/project';
import { espressoProject } from './espresso';
import { gutProject } from './gut';
import { heartProject } from './heart';
import { kettleProject } from './kettle';
import { microwaveProject } from './microwave';
import { papercutProject } from './papercut';
import { showerProject } from './shower';

export const projects: Record<string, ExplainerProject> = {
  [kettleProject.id]: kettleProject,
  [espressoProject.id]: espressoProject,
  [microwaveProject.id]: microwaveProject,
  [heartProject.id]: heartProject,
  [gutProject.id]: gutProject,
  [papercutProject.id]: papercutProject,
  [showerProject.id]: showerProject,
};
export const defaultProjectId = kettleProject.id;
