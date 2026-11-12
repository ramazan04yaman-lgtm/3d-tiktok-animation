import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/lilita-one/400.css';
import './styles.css';
import { type ApiState, api } from './api.ts';
import { EarthScene } from './earth/scene.ts';
import { replay } from './sim/simulation.ts';
import { type Snapshot, toSnapshot } from './sim/snapshot.ts';
import { DEFAULT_VISUAL, type VisualScaleOptions, visualDrainFraction } from './sim/visualScale.ts';
import { Hud } from './ui/hud.ts';
import { Panel } from './ui/panel.ts';

const params = new URLSearchParams(location.search);
/** Aufnahme-Modus: feste Auflösung (z. B. 1080x1920), Zeit wird von außen gesteuert. */
const capture = params.has('capture');
const captureH = Number(params.get('capture')) || 1920;
document.body.classList.toggle('capture', capture);

const stage = document.querySelector<HTMLElement>('#stage')!;
const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const loading = document.querySelector<HTMLElement>('#loading')!;
const scene = new EarthScene(canvas);
const hud = new Hud(document.querySelector<HTMLElement>('#hud')!);

let snapshot: Snapshot = toSnapshot(replay('2026-01-01', [], '2026-01-01'));
let visual: VisualScaleOptions = { ...DEFAULT_VISUAL };
let preview: number | null = null;

function applyState(s: ApiState | { snapshot: Snapshot }): void {
  snapshot = s.snapshot;
  scene.people.setPopulation(BigInt(snapshot.population));
  updateDrain();
}

function realDrain(): number {
  return visualDrainFraction(BigInt(snapshot.totalConsumedMl), BigInt(snapshot.totalWaterMl), visual);
}

function updateDrain(): void {
  scene.drainTarget = preview ?? realDrain();
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

async function main(): Promise<void> {
  const bar = loading.querySelector<HTMLElement>('i')!;
  await scene.init((p) => { bar.style.width = `${p * 100}%`; });
  if (params.get('shot')) scene.director.setShot(params.get('shot')!, 0, 0.001);
  resize();
  window.addEventListener('resize', resize);

  const panel = new Panel(document.querySelector<HTMLElement>('#panel')!, {
    onState: applyState,
    onShot: (n) => { scene.setFreeCamera(false); scene.director.setShot(n, time); },
    onFreeCamera: (on) => scene.setFreeCamera(on),
    onPreview: (v) => { preview = v; updateDrain(); },
    onVisualMode: (m) => { visual = { ...visual, mode: m }; updateDrain(); },
    onToggle: (w, on) => {
      if (w === 'hud') document.querySelector<HTMLElement>('#hud')!.style.display = on ? '' : 'none';
      if (w === 'clouds') scene.showClouds = on;
      if (w === 'people') scene.people.group.visible = on;
    },
  });

  try {
    const s = await api.state();
    panel.setState(s);
    applyState(s);
  } catch (e) {
    panel.offline((e as Error).message);
    applyState({ snapshot });
  }
  // Startwert sofort anzeigen (nicht animieren)
  scene.drainShown = scene.drainTarget;
  loading.style.display = 'none';

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
    tick(time, dt);
    requestAnimationFrame(frame);
  };
  if (!capture) requestAnimationFrame(frame);
  ready = true;

  // Steuerung von außen (für spätere Video-Aufnahme mit festen Bildern)
  Object.assign(window, {
    __sim: {
      ready: () => ready,
      renderAt: (t: number, dt = 1 / 30) => { time = t; tick(t, dt); },
      setShot: (n: string, t = time, trans = 3) => scene.director.setShot(n, t, trans),
      setPreview: (v: number | null, instant = false) => { preview = v; updateDrain(); if (instant) scene.drainShown = scene.drainTarget; },
      setHud: (on: boolean) => { document.querySelector<HTMLElement>('#hud')!.style.display = on ? '' : 'none'; },
      setSnapshot: (s: Snapshot) => applyState({ snapshot: s }),
    },
  });
}

let time = 0;
let ready = false;
function tick(t: number, dt: number): void {
  time = t;
  scene.render(t, dt);
  hud.update(snapshot, {
    visualDrain: scene.drainShown, seaLevel: scene.info.seaLevel, perFigure: scene.people.perFigure,
    preview: preview !== null, mode: visual.mode,
  });
}

main().catch((e) => {
  console.error(e);
  loading.innerHTML = `<p>❌ Fehler beim Laden: ${(e as Error).message}</p>`;
});
