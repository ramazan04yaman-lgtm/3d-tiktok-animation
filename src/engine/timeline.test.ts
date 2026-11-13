import { describe, expect, it } from 'vitest';
import { Timeline } from './timeline';
import { kettleTimeline } from '../projects/kettle/script';
import * as track from '../projects/kettle/script';
import { BOIL_SECONDS, waterTempAt } from '../projects/kettle/physics';

describe('Timeline', () => {
  it('rejects gaps between scenes', () => {
    expect(
      () =>
        new Timeline({
          duration: 10,
          scenes: [
            { id: 'a', start: 0, end: 4, title: 'a' },
            { id: 'b', start: 5, end: 10, title: 'b' },
          ],
          captions: [],
        }),
    ).toThrow(/gap/);
  });

  it('kettle demo is exactly 60 s / 1800 frames at 30 fps with 8 scenes', () => {
    expect(kettleTimeline.duration).toBe(60);
    expect(kettleTimeline.fps).toBe(30);
    expect(kettleTimeline.totalFrames).toBe(1800);
    expect(kettleTimeline.scenes).toHaveLength(8);
  });
});

describe('kettle physics & tracks', () => {
  it('reaches 100 °C after ~3¼ min of real heating (1 l, 2 kW)', () => {
    expect(BOIL_SECONDS).toBeGreaterThan(170);
    expect(BOIL_SECONDS).toBeLessThan(220);
    expect(waterTempAt(0)).toBe(20);
    expect(waterTempAt(1e6)).toBe(100);
  });

  it('temperature is monotonic and boils at the scripted time', () => {
    let prev = 0;
    for (let f = 0; f < 1800; f++) {
      const temp = track.waterTemp(f / 30);
      expect(temp).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = temp;
    }
    expect(track.waterTemp(track.T.boil - 0.5)).toBeLessThan(100);
    expect(track.waterTemp(track.T.boil)).toBeCloseTo(100, 3);
  });

  it('power switches off exactly when the bimetal snaps', () => {
    expect(track.power(track.T.switchOff - 1 / 30)).toBe(1);
    expect(track.power(track.T.switchOff)).toBe(0);
    expect(track.snap(track.T.switchOff + 0.1)).toBe(1);
  });

  it('all tracks stay within [0,1]', () => {
    const fns = [track.cut, track.explode, track.thermalView, track.convection, track.boiling, track.bubbleIntensity, track.steam, track.ductFlow, track.snap, track.switchPos, track.elementHeat];
    for (let f = 0; f <= 1800; f++) for (const fn of fns) {
      const v = fn(f / 30);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
