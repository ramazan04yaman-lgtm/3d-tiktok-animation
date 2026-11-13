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
  /** Aktuelle Verbrauchsstufe (ml). */
  stufe: { likeMl: string; kommentarMl: string; shareMl: string; trinkMl: string;
    meilensteine: { like: string; kommentar: string; share: string; trinken: string } };
  /** Nächste Meilensteine (der nächste zuerst). */
  naechste: { regel: string; follower: string; neuMl: string }[];
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
    stufe: {
      likeMl: s.stufe.likeMl.toString(), kommentarMl: s.stufe.kommentarMl.toString(),
      shareMl: s.stufe.shareMl.toString(), trinkMl: s.stufe.trinkMl.toString(),
      meilensteine: {
        like: s.stufe.stufen.like.toString(), kommentar: s.stufe.stufen.kommentar.toString(),
        share: s.stufe.stufen.share.toString(), trinken: s.stufe.stufen.trinken.toString(),
      },
    },
    naechste: s.naechste.map((n) => ({ regel: n.regel, follower: n.follower.toString(), neuMl: n.neuMl.toString() })),
  };
}
