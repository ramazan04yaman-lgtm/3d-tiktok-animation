import { VIDEO } from './config';

export interface SceneDef {
  id: string;
  /** seconds, inclusive */
  start: number;
  /** seconds, exclusive */
  end: number;
  title: string;
}

export interface CaptionDef {
  start: number;
  end: number;
  text: string;
  sub?: string;
}

export interface TimelineDef {
  duration: number;
  fps?: number;
  scenes: SceneDef[];
  captions: CaptionDef[];
}

/**
 * Validated, second-accurate timeline. Scenes must be contiguous and cover [0, duration].
 */
export class Timeline {
  readonly duration: number;
  readonly fps: number;
  readonly scenes: SceneDef[];
  readonly captions: CaptionDef[];

  constructor(def: TimelineDef) {
    this.duration = def.duration;
    this.fps = def.fps ?? VIDEO.fps;
    this.scenes = [...def.scenes].sort((a, b) => a.start - b.start);
    this.captions = [...def.captions].sort((a, b) => a.start - b.start);
    const errors = Timeline.validate(this);
    if (errors.length) throw new Error('Invalid timeline:\n' + errors.join('\n'));
  }

  static validate(tl: Timeline): string[] {
    const e: string[] = [];
    if (!tl.scenes.length) return ['no scenes'];
    if (tl.scenes[0].start !== 0) e.push(`first scene must start at 0 (got ${tl.scenes[0].start})`);
    const last = tl.scenes[tl.scenes.length - 1];
    if (last.end !== tl.duration) e.push(`last scene must end at duration ${tl.duration} (got ${last.end})`);
    tl.scenes.forEach((s, i) => {
      if (s.end <= s.start) e.push(`scene ${s.id}: end <= start`);
      const next = tl.scenes[i + 1];
      if (next && Math.abs(next.start - s.end) > 1e-9) e.push(`gap/overlap between ${s.id} and ${next.id}`);
    });
    tl.captions.forEach((c) => {
      if (c.start < 0 || c.end > tl.duration || c.end <= c.start) e.push(`caption "${c.text}" out of range`);
    });
    return e;
  }

  get totalFrames() {
    return Math.round(this.duration * this.fps);
  }

  sceneAt(t: number): SceneDef {
    return this.scenes.find((s) => t >= s.start && t < s.end) ?? this.scenes[this.scenes.length - 1];
  }

  /** 0..1 progress within a scene (clamped). */
  progress(id: string, t: number) {
    const s = this.scenes.find((x) => x.id === id);
    if (!s) throw new Error(`unknown scene ${id}`);
    return Math.min(1, Math.max(0, (t - s.start) / (s.end - s.start)));
  }

  captionAt(t: number): CaptionDef | undefined {
    return this.captions.find((c) => t >= c.start && t < c.end);
  }
}
