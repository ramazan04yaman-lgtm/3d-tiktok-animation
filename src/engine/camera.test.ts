import { describe, expect, it } from 'vitest';
import { CameraPath } from './camera';
import { VIDEO } from './config';
import { kettleCamera } from '../projects/kettle/script';

/** Analyse a path frame by frame like the exporter would see it. */
function analyse(path: CameraPath, duration: number) {
  const dt = 1 / VIDEO.fps;
  const n = Math.round(duration * VIDEO.fps);
  let maxSpeed = 0;
  let maxAccel = 0;
  let prevV: number[] | null = null;
  let prev = path.sample(0);
  for (let f = 1; f <= n; f++) {
    const s = path.sample(f * dt);
    const v = [0, 1, 2].map((i) => (s.position[i] - prev.position[i]) / dt);
    const speed = Math.hypot(...v);
    maxSpeed = Math.max(maxSpeed, speed);
    if (prevV) {
      const a = Math.hypot(...v.map((x, i) => (x - prevV![i]) / dt));
      maxAccel = Math.max(maxAccel, a);
    }
    prevV = v;
    prev = s;
  }
  return { maxSpeed, maxAccel };
}

describe('CameraPath', () => {
  it('passes exactly through keys', () => {
    const p = new CameraPath([
      { t: 0, position: [0, 0, 5], target: [0, 0, 0] },
      { t: 2, position: [2, 1, 4], target: [0, 1, 0] },
      { t: 4, position: [0, 0, 3], target: [0, 0, 0] },
    ]);
    expect(p.sample(2).position).toEqual([2, 1, 4]);
    expect(p.sample(4).position).toEqual([0, 0, 3]);
  });

  it('has continuous velocity (no jerks) on the kettle camera path', () => {
    const { maxSpeed, maxAccel } = analyse(kettleCamera, 60);
    // Units are decimetres; < 6 dm/s is a calm dolly, accel bound rules out velocity jumps.
    console.log({ maxSpeed, maxAccel });
    expect(maxSpeed).toBeLessThan(6);
    // A velocity discontinuity of only 0.3 dm/s between two frames would already give 9 dm/s² — keep well below.
    expect(maxAccel).toBeLessThan(8);
  });
});
