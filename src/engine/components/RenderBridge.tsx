import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useTime } from '../time';
import type { Timeline } from '../timeline';
import { VIDEO } from '../config';

export interface RenderAPI {
  ready: boolean;
  fps: number;
  duration: number;
  totalFrames: number;
  width: number;
  height: number;
  errors: string[];
  /** Sets the timeline to `frame`, renders synchronously, resolves when the DOM is painted. */
  setFrame: (frame: number) => Promise<void>;
}

declare global {
  interface Window {
    __MX__?: RenderAPI;
  }
}

const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Exposes a frame-accurate control API to the Playwright exporter.
 * The canvas runs with frameloop="never"; every frame is produced explicitly via advance().
 */
export function RenderBridge({ timeline }: { timeline: Timeline }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const errors: string[] = (window.__MX__?.errors as string[]) ?? [];
    const api: RenderAPI = {
      ready: false,
      fps: timeline.fps,
      duration: timeline.duration,
      totalFrames: timeline.totalFrames,
      width: VIDEO.width,
      height: VIDEO.height,
      errors,
      setFrame: async (frame: number) => {
        const t = frame / timeline.fps;
        flushSync(() => useTime.getState().setTime(t));
        advance(t * 1000);
        await nextPaint();
      },
    };
    window.__MX__ = api;
    (async () => {
      await document.fonts.ready;
      // warm-up: environment map, shader compilation, shadow maps
      for (let i = 0; i < 3; i++) {
        advance(i * 16);
        await nextPaint();
      }
      api.ready = true;
    })();
  }, [advance, timeline]);
  return null;
}
