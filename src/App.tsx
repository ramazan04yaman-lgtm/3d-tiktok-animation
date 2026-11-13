import { GLBExport } from './engine/GLBExport';
import { Player } from './engine/Player';
import { Stage } from './engine/Stage';
import { useTime } from './engine/time';
import { defaultProjectId, projects } from './projects/registry';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'preview';
const project = projects[params.get('project') ?? defaultProjectId];
const startAt = params.get('t');
if (startAt) useTime.getState().setTime(parseFloat(startAt));

export default function App() {
  if (!project) return <div style={{ color: '#fff' }}>Unknown project. Available: {Object.keys(projects).join(', ')}</div>;
  if (mode === 'render') {
    document.body.classList.add('mx-render');
    return <Stage project={project} mode="render" />;
  }
  if (mode === 'export-glb') return <GLBExport project={project} />;
  return <Player project={project} />;
}
