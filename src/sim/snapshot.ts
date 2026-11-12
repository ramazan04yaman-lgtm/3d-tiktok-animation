/** Wandelt den Zustand in ein JSON-taugliches Objekt (BigInt -> String). */
import type { SimState } from './simulation.ts';
import { daysUntilEmpty } from './simulation.ts';

export interface Snapshot {
  startDay: string;
  lastProcessedDay: string;
  lastProcessedAt: string;
  daysProcessed: number;
  followers: string;
  population: string;
  likes: string;
  comments: string;
  shares: string;
  totalWaterMl: string;
  remainingMl: string;
  totalConsumedMl: string;
  dailyMl: string;
  consumedMl: { drinking: string; likes: string; comments: string; shares: string };
  daysUntilEmpty: string | null;
  depletedOnDay: string | null;
  entryCount: number;
}

export function toSnapshot(s: SimState, processedAt: Date = new Date()): Snapshot {
  const d = daysUntilEmpty(s);
  return {
    startDay: s.startDay,
    lastProcessedDay: s.lastProcessedDay,
    lastProcessedAt: processedAt.toISOString(),
    daysProcessed: s.daysProcessed,
    followers: s.followers.toString(),
    population: s.population.toString(),
    likes: s.likes.toString(),
    comments: s.comments.toString(),
    shares: s.shares.toString(),
    totalWaterMl: s.totalWaterMl.toString(),
    remainingMl: s.remainingMl.toString(),
    totalConsumedMl: s.totalConsumedMl.toString(),
    dailyMl: s.dailyMl.toString(),
    consumedMl: {
      drinking: s.consumed.drinking.toString(),
      likes: s.consumed.likes.toString(),
      comments: s.consumed.comments.toString(),
      shares: s.consumed.shares.toString(),
    },
    daysUntilEmpty: d === null ? null : d.toString(),
    depletedOnDay: s.depletedOnDay,
    entryCount: s.entryCount,
  };
}
