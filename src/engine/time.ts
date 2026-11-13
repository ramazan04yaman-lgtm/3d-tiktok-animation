import { create } from 'zustand';
import { useFrame, type RootState } from '@react-three/fiber';

/**
 * The single source of truth for "where are we in the video".
 * All animation is a pure function of `time` — never of wall-clock or frame deltas —
 * so any frame can be rendered in any order with identical results.
 */
interface TimeState {
  time: number;
  playing: boolean;
  setTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
}

export const useTime = create<TimeState>((set) => ({
  time: 0,
  playing: false,
  setTime: (time) => set({ time }),
  setPlaying: (playing) => set({ playing }),
}));

export const getTime = () => useTime.getState().time;

/** useFrame variant that hands the current timeline time to the callback. */
export function useTimelineFrame(cb: (t: number, state: RootState) => void, priority?: number) {
  useFrame((state) => cb(getTime(), state), priority);
}
