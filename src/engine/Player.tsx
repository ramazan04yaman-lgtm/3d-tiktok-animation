import { useEffect, useState } from 'react';
import { VIDEO } from './config';
import type { ExplainerProject } from './project';
import { Stage } from './Stage';
import { useTime } from './time';

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

/** Browser preview: scaled 9:16 stage + transport controls + scene list. */
export function Player({ project }: { project: ExplainerProject }) {
  const { timeline } = project;
  const time = useTime((s) => s.time);
  const playing = useTime((s) => s.playing);
  const { setTime, setPlaying } = useTime.getState();
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerHeight - 40) / VIDEO.height, (window.innerWidth - 380) / VIDEO.width));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useTime.getState();
      const step = 1 / timeline.fps;
      if (e.code === 'Space') {
        e.preventDefault();
        s.setPlaying(!s.playing);
      } else if (e.code === 'ArrowRight') s.setTime(Math.min(timeline.duration, s.time + (e.shiftKey ? 1 : step)));
      else if (e.code === 'ArrowLeft') s.setTime(Math.max(0, s.time - (e.shiftKey ? 1 : step)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timeline]);

  const current = timeline.sceneAt(time);
  return (
    <div className="mx-player">
      <div className="mx-stage-wrap" style={{ width: VIDEO.width * scale, height: VIDEO.height * scale }}>
        <Stage project={project} mode="preview" scale={scale} />
      </div>
      <aside className="mx-panel">
        <h1>{project.title}</h1>
        <div className="mx-time">
          {fmt(time)} / {fmt(timeline.duration)} · Frame {Math.round(time * timeline.fps)} / {timeline.totalFrames}
        </div>
        <div className="mx-buttons">
          <button onClick={() => setPlaying(!playing)}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <button onClick={() => setTime(0)}>⏮ Start</button>
        </div>
        <input
          type="range"
          min={0}
          max={timeline.duration}
          step={1 / timeline.fps}
          value={time}
          onChange={(e) => setTime(parseFloat(e.target.value))}
        />
        <ol className="mx-scenes">
          {timeline.scenes.map((s) => (
            <li key={s.id} className={s.id === current.id ? 'active' : ''} onClick={() => setTime(s.start)}>
              <span>{fmt(s.start)}</span> {s.title}
            </li>
          ))}
        </ol>
        <p className="mx-hint">Leertaste: Play/Pause · ←/→: Frame · Shift+←/→: 1 s</p>
        {project.disclaimer && <p className="mx-hint">{project.disclaimer}</p>}
      </aside>
    </div>
  );
}
