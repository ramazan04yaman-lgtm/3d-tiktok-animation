/**
 * Zeigt den Text einer Folge zum Vorlesen an – mit den echten Zahlen.
 *   npm run sprechertext -- --folge folge-01 [--demo]
 * Lies jeden Satz vor und mach dazwischen ca. 1 Sekunde Pause.
 */
import { beispielZahlen, echteZahlen, folgenPfad, loadFolge } from '../server/folgen.ts';
import { ersetze, plain, platzhalter } from '../src/video/script.ts';

const a = process.argv.slice(2);
const name = a[a.indexOf('--folge') + 1] ?? 'folge-01';
const demo = a.includes('--demo');
const folge = loadFolge(folgenPfad(name));
const z = demo ? beispielZahlen() : echteZahlen();
const p = platzhalter(z.snapshot, z.seit);
console.log(`\n🎙️  ${folge.titel} – Text zum Vorlesen (${folge.beats.length} Sätze, zwischen den Sätzen ~1 s Pause):\n`);
folge.beats.forEach((b, i) => console.log(`${String(i + 1).padStart(2)}. ${plain(ersetze(b.sprache ?? b.text, p))}`));
console.log('');
