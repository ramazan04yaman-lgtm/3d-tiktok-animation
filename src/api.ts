/** Verbindung zum lokalen Speicher-Server (läuft mit "npm run dev"). */
import type { Entry } from './sim/simulation.ts';
import type { Snapshot } from './sim/snapshot.ts';

export interface ApiState {
  today: string;
  snapshot: Snapshot;
  entries: Entry[];
  startDay: string;
  warnings?: string[];
}

export interface EntryForm {
  mode: 'new' | 'totals';
  followers?: number; likes?: number; comments?: number; shares?: number;
  day?: string; ref?: string; note?: string;
}

async function call(method: string, url: string, body?: unknown): Promise<ApiState> {
  const r = await fetch(url, {
    method, headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({ error: `Server antwortet nicht (${r.status})` }));
  if (!r.ok) throw new Error(j.error ?? `Fehler ${r.status}`);
  return j as ApiState;
}

export const api = {
  state: () => call('GET', '/api/state'),
  add: (f: EntryForm) => call('POST', '/api/entries', f),
  remove: (id: string) => call('DELETE', `/api/entries/${encodeURIComponent(id)}`),
};
