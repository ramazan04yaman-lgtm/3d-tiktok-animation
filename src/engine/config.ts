/** Global video format. Every project renders in exactly this format. */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const frameToTime = (frame: number, fps: number = VIDEO.fps) => frame / fps;
export const timeToFrame = (t: number, fps: number = VIDEO.fps) => Math.round(t * fps);
