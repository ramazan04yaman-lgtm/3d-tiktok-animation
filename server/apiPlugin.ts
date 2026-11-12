/**
 * Kleiner Speicher-Server, der in den Vite-Entwicklungsserver eingebaut ist.
 * Der Browser schickt neue Zahlen hierher; gespeichert wird in data/simulation.json.
 *
 *   GET    /api/state         -> aktueller Stand (alle Tage bis heute verbucht)
 *   POST   /api/entries       -> neuen Eintrag speichern
 *   DELETE /api/entries/:id   -> Eintrag löschen
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { DEFAULT_PATH, type EntryInput, type SimFile, addEntry, loadOrCreate, removeEntry, saveFile, today } from './store.ts';

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e5) reject(new Error('Anfrage zu groß')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Ungültiges JSON')); } });
  });
}

function view(f: SimFile, warnings: string[] = []) {
  return { today: today(f), startDay: f.startDay, entries: f.entries, snapshot: f.snapshot, warnings };
}

export function simulationApi(file = DEFAULT_PATH): Plugin {
  // Nur ein Schreibvorgang gleichzeitig
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => T | Promise<T>): Promise<T> => {
    const p = queue.then(fn);
    queue = p.catch(() => undefined);
    return p;
  };
  return {
    name: 'simulation-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        void serial(async () => {
          try {
            const url = req.url ?? '/';
            if (req.method === 'GET' && url.startsWith('/state')) {
              // Bei jedem Abruf: alle vergangenen Tage verbuchen und speichern
              return send(res, 200, view(saveFile(loadOrCreate(file), file)));
            }
            if (req.method === 'POST' && url === '/entries') {
              const body = (await readBody(req)) as EntryInput;
              if (body.mode !== 'new' && body.mode !== 'totals') throw new Error('mode muss "new" oder "totals" sein');
              const r = addEntry(loadOrCreate(file), body);
              return send(res, 200, view(saveFile(r.file, file), r.warnings));
            }
            const m = url.match(/^\/entries\/([\w-]+)$/);
            if (req.method === 'DELETE' && m) {
              return send(res, 200, view(saveFile(removeEntry(loadOrCreate(file), m[1]), file)));
            }
            send(res, 404, { error: 'Unbekannte Adresse' });
          } catch (e) {
            send(res, 400, { error: (e as Error).message });
          }
        });
      });
    },
  };
}
