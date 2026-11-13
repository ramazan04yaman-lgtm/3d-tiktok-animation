/**
 * Kommandozeilen-Werkzeug für die Simulation.
 *
 *   npm run sim -- status
 *   npm run sim -- add --followers 120 --likes 3400 --comments 56 --shares 12 [--day 2026-11-12] [--ref video-01]
 *   npm run sim -- totals --followers 1520 --likes 48000 --comments 900 --shares 300   (Gesamtstand aus TikTok)
 *   npm run sim -- sync         (alle Tage bis heute verbuchen und speichern)
 *   npm run sim -- undo         (letzten Eintrag löschen)
 *   npm run sim -- init --start 2026-11-12   (Startdatum festlegen; nur ohne Einträge)
 *   Option --file <pfad> für eine andere Datei (z. B. zum Testen)
 */
import path from 'node:path';
import { assertDay } from '../src/sim/days.ts';
import { formatDuration, formatLiters, groupDE, percentExact, sci } from '../src/sim/format.ts';
import { daysUntilEmpty } from '../src/sim/simulation.ts';
import { formatMenge } from '../src/sim/format.ts';
import { DEFAULT_PATH, addEntry, computeState, loadFile, loadOrCreate, newFile, removeEntry, saveFile, today } from '../server/store.ts';

const [cmd = 'status', ...rest] = process.argv.slice(2);
const opts: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (!a.startsWith('--')) throw new Error(`Unbekanntes Argument: ${a}`);
  const [k, v] = a.includes('=') ? a.slice(2).split('=', 2) : [a.slice(2), rest[++i]];
  if (v === undefined) throw new Error(`Wert fehlt für --${k}`);
  opts[k] = v;
}
const file = opts.file ? path.resolve(opts.file) : DEFAULT_PATH;

function num(k: string): number | undefined {
  if (opts[k] === undefined) return undefined;
  const n = Number(opts[k].replace(/[._]/g, ''));
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`--${k} muss eine ganze Zahl >= 0 sein`);
  return n;
}

function printStatus(): void {
  const f = loadOrCreate(file);
  const s = computeState(f, today(f));
  const line = (a: string, b: string) => console.log('  ' + a.padEnd(32, '.') + ' ' + b);
  console.log(`\n🌍  KÖNNEN WIR DAS GESAMTE WASSER DER ERDE AUSTRINKEN?  (Stand: ${s.lastProcessedDay})\n`);
  line('Ursprünglicher Vorrat (≈)', `${formatLiters(s.totalWaterMl)}  (${sci(s.totalWaterMl / 1000n / 10n ** 12n)} km³)`);
  line('Verbleibender Vorrat', formatLiters(s.remainingMl));
  line('Verbleibend in %', percentExact(s.remainingMl, s.totalWaterMl, 16) + ' %');
  line('Bisher verbraucht', formatLiters(s.totalConsumedMl));
  line('  davon Trinken', formatLiters(s.consumed.drinking));
  line('  davon Likes', `${formatLiters(s.consumed.likes)}  (${groupDE(s.likes)} Likes)`);
  line('  davon Kommentare', `${formatLiters(s.consumed.comments)}  (${groupDE(s.comments)} Kommentare)`);
  line('  davon Shares', `${formatLiters(s.consumed.shares)}  (${groupDE(s.shares)} Shares)`);
  line('Follower gesamt', groupDE(s.followers));
  line('Einwohner gesamt', groupDE(s.population));
  line('Täglicher Trinkverbrauch', formatLiters(s.dailyMl) + ' / Tag');
  line('Wasser reicht noch', formatDuration(daysUntilEmpty(s)));
  console.log('\n  ⚡ VERBRAUCHSSTUFE (Meilensteine)');
  line('  pro Einwohner und Tag', `${formatMenge(s.stufe.trinkMl)}  (Stufe ${s.stufe.stufen.trinken})`);
  line('  pro Like', `${formatMenge(s.stufe.likeMl)}  (Stufe ${s.stufe.stufen.like})`);
  line('  pro Kommentar', `${formatMenge(s.stufe.kommentarMl)}  (Stufe ${s.stufe.stufen.kommentar})`);
  line('  pro Share', `${formatMenge(s.stufe.shareMl)}  (Stufe ${s.stufe.stufen.share})`);
  for (const n of s.naechste) {
    const was = n.regel === 'like' ? 'pro Like' : n.regel === 'kommentar' ? 'pro Kommentar' : n.regel === 'share' ? 'pro Share' : 'pro Einwohner/Tag';
    line(`  🎯 bei ${groupDE(n.follower)} Followern`, `${formatMenge(n.neuMl)} ${was} (noch ${groupDE(n.follower - s.followers)})`);
  }
  line('Berechnete Tage', `${s.daysProcessed} (seit ${s.startDay})`);
  line('Einträge im Logbuch', String(s.entryCount));
  console.log(`\n  Datei: ${file}\n`);
}

try {
  switch (cmd) {
    case 'status': printStatus(); break;
    case 'init': {
      const existing = loadFile(file);
      if (existing && existing.entries.length) throw new Error('Es gibt schon Einträge – Startdatum kann nicht mehr geändert werden.');
      saveFile(newFile(assertDay(opts.start ?? today())), file);
      printStatus(); break;
    }
    case 'add':
    case 'totals': {
      const f = loadOrCreate(file);
      const r = addEntry(f, {
        mode: cmd === 'add' ? 'new' : 'totals',
        followers: num('followers'), likes: num('likes'), comments: num('comments'), shares: num('shares'),
        day: opts.day, ref: opts.ref, note: opts.note,
      });
      saveFile(r.file, file);
      const e = r.entry;
      console.log(`✅ Eingetragen für ${e.day}: +${groupDE(e.followers)} Follower, +${groupDE(e.likes)} Likes, ` +
        `+${groupDE(e.comments)} Kommentare, +${groupDE(e.shares)} Shares`);
      r.warnings.forEach((w) => console.log('⚠️  ' + w));
      printStatus(); break;
    }
    case 'sync': saveFile(loadOrCreate(file), file); printStatus(); break;
    case 'undo': {
      const f = loadOrCreate(file);
      const last = [...f.entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).pop();
      if (!last) throw new Error('Keine Einträge vorhanden.');
      saveFile(removeEntry(f, last.id), file);
      console.log(`↩️  Letzter Eintrag (${last.day}, +${last.followers} Follower) wurde gelöscht.`);
      printStatus(); break;
    }
    default: throw new Error(`Unbekannter Befehl: ${cmd}`);
  }
} catch (err) {
  console.error('❌ ' + (err as Error).message);
  process.exit(1);
}
