import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/lilita-one/400.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import './styles.css';
import { type ApiState, api } from './api.ts';
import { EarthScene } from './earth/scene.ts';
import { replay } from './sim/simulation.ts';
import { type Snapshot, toSnapshot } from './sim/snapshot.ts';
import { DEFAULT_VISUAL, type VisualScaleOptions, visualDrainFraction } from './sim/visualScale.ts';
import { Hud } from './ui/hud.ts';
import { Panel } from './ui/panel.ts';
import { StoryPlayer } from './video/player.ts';
import type { Timeline } from './video/types.ts';

const params = new URLSearchParams(location.search);
/** Aufnahme-Modus: feste Auflösung (z. B. 1080x1920), Zeit wird von außen gesteuert. */
const capture = params.has('capture');
const captureH = Number(params.get('capture')) || 1920;
document.body.classList.toggle('capture', capture);

const stage = document.querySelector<HTMLElement>('#stage')!;
const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const loading = document.querySelector<HTMLElement>('#loading')!;
const hudEl = document.querySelector<HTMLElement>('#hud')!;
const storyEl = document.querySelector<HTMLElement>('#story')!;
const scene = new EarthScene(canvas);
if (params.get('leicht')) scene.segments = 512;
const hud = new Hud(hudEl);

let snapshot: Snapshot = toSnapshot(replay('2026-01-01', [], '2026-01-01'));
let visual: VisualScaleOptions = { ...DEFAULT_VISUAL };
let preview: number | null = null;
let demo = false;
let story: StoryPlayer | null = null;
let storyStart = 0;
let time = 0;
let ready = false;

function applySnapshot(s: Snapshot): void {
  snapshot = s;
  scene.people.setPopulation(BigInt(snapshot.population));
  scene.updateFirstPerson();
  updateDrain();
}

const realDrain = () => visualDrainFraction(BigInt(snapshot.totalConsumedMl), BigInt(snapshot.totalWaterMl), visual);
function updateDrain(): void { if (!story) scene.drainTarget = preview ?? realDrain(); }

function startStory(tl: Timeline, startAt = time): void {
  story?.dispose();
  story = new StoryPlayer(tl, scene, storyEl, realDrain, () => String(Math.max(1, snapshot.daysProcessed)));
  storyStart = startAt;
  hud.showStats = false;
  document.body.classList.add('story');
}

function stopStory(): void {
  story?.dispose();
  story = null;
  scene.mascotVisible = scene.strawVisible = scene.previewActive = false;
  hud.showStats = (document.querySelector<HTMLInputElement>('#stats')?.checked) ?? true;
  document.body.classList.remove('story');
  scene.director.setShot('space', time);
  updateDrain();
}

function resize(): void {
  if (capture) {
    const w = Math.round(captureH * 9 / 16);
    stage.style.width = w + 'px'; stage.style.height = captureH + 'px';
    scene.resize(w, captureH, 1);
    return;
  }
  const r = stage.getBoundingClientRect();
  scene.resize(r.width, r.height, Math.min(window.devicePixelRatio, 2));
}

function tick(t: number, dt: number): void {
  time = t;
  if (story) {
    const local = t - storyStart;
    if (!capture && local > story.dauer + 1.5) stopStory();
    else story.apply(Math.max(0, local));
  }
  scene.render(t, dt);
  hud.update(snapshot, {
    visualDrain: scene.drainShown, seaLevel: scene.info.seaLevel, perFigure: scene.people.perFigure,
    preview: preview !== null || scene.previewActive, mode: visual.mode, demo,
  });
}

async function main(): Promise<void> {
  const bar = loading.querySelector<HTMLElement>('i')!;
  await scene.init((p) => { bar.style.width = `${p * 100}%`; });
  if (params.get('shot')) scene.director.setShot(params.get('shot')!, 0, 0.001);
  resize();
  window.addEventListener('resize', resize);

  const panel = new Panel(document.querySelector<HTMLElement>('#panel')!, {
    onState: (s: ApiState) => applySnapshot(s.snapshot),
    onShot: (n) => { stopStoryIfAny(); scene.setFreeCamera(false); scene.director.setShot(n, time); },
    onFreeCamera: (on) => { stopStoryIfAny(); scene.setFreeCamera(on); },
    onPreview: (v) => { preview = v; updateDrain(); },
    onVisualMode: (m) => { visual = { ...visual, mode: m }; updateDrain(); },
    onToggle: (w, on) => {
      if (w === 'hud') hudEl.style.display = on ? '' : 'none';
      if (w === 'clouds') scene.showClouds = on;
      if (w === 'people') scene.showPeople = on;
      if (w === 'stats') hud.showStats = on;
      if (w === 'straw') scene.strawVisible = on;
      if (w === 'mascot') scene.mascotVisible = on;
    },
    onPlay: async (folge) => {
      const r = await api.timeline(folge);
      applySnapshot(r.snapshot);
      startStory(r.timeline);
    },
    onStop: () => stopStory(),
  });
  const stopStoryIfAny = () => { if (story) stopStory(); };

  if (!capture) {
    try {
      const s = await api.state();
      panel.setState(s);
      applySnapshot(s.snapshot);
      panel.setFolgen(await api.folgen());
    } catch (e) {
      panel.offline((e as Error).message);
      applySnapshot(snapshot);
    }
  }
  scene.drainShown = scene.drainTarget;
  if (document.fonts) await document.fonts.ready;
  loading.style.display = 'none';

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    tick(time + dt, dt);
    requestAnimationFrame(frame);
  };
  if (!capture) requestAnimationFrame(frame);
  if (params.get('folge') && !capture) await panel.play(params.get('folge')!);
  ready = true;
}

// Steuerung von außen (Video-Renderer, Screenshots)
Object.assign(window, {
  __sim: {
    ready: () => ready,
    renderAt: (t: number, dt = 1 / 30) => tick(t, dt),
    setShot: (n: string, t = time, trans = 3) => scene.director.setShot(n, t, trans),
    setPreview: (v: number | null, instant = false) => { preview = v; updateDrain(); if (instant) scene.drainShown = scene.drainTarget; },
    setHud: (on: boolean) => { hudEl.style.display = on ? '' : 'none'; },
    setStats: (on: boolean) => { hud.showStats = on; },
    setSnapshot: (s: Snapshot) => applySnapshot(s),
    loadStory: (tl: Timeline, s: Snapshot, isDemo = false) => {
      demo = isDemo; applySnapshot(s); startStory(tl, 0);
    },
    show: (what: { mascot?: boolean; straw?: boolean }) => {
      if (what.mascot !== undefined) scene.mascotVisible = what.mascot;
      if (what.straw !== undefined) scene.strawVisible = what.straw;
    },
  },
});

main().catch((e) => {
  console.error(e);
  loading.innerHTML = `<p>❌ Fehler beim Laden: ${(e as Error).message}</p>`;
});
