import type { ExplainerProject } from '../engine/project';
import { airconProject } from './aircon';
import { brainProject } from './brain';
import { dishwasherProject } from './dishwasher';
import { espressoProject } from './espresso';
import { gutProject } from './gut';
import { heartProject } from './heart';
import { heatingProject } from './heating';
import { kettleProject } from './kettle';
import { microwaveProject } from './microwave';
import { papercutProject } from './papercut';
import { showerProject } from './shower';
import { spoonProject } from './spoon';

export const projects: Record<string, ExplainerProject> = {
  [kettleProject.id]: kettleProject,
  [espressoProject.id]: espressoProject,
  [microwaveProject.id]: microwaveProject,
  [heartProject.id]: heartProject,
  [gutProject.id]: gutProject,
  [papercutProject.id]: papercutProject,
  [showerProject.id]: showerProject,
  [spoonProject.id]: spoonProject,
  [dishwasherProject.id]: dishwasherProject,
  [heatingProject.id]: heatingProject,
  [airconProject.id]: airconProject,
  [brainProject.id]: brainProject,
};
export const defaultProjectId = kettleProject.id;
