/**
 * Lädt die kostenlose deutsche KI-Stimme "Thorsten" (Piper, Lizenz CC0) herunter
 * und installiert Piper (Python).   npm run stimme-laden
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '..', 'tools', 'stimmen');
fs.mkdirSync(dir, { recursive: true });
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/';
const stimmen = [['thorsten/high/', 'de_DE-thorsten-high'], ['thorsten_emotional/medium/', 'de_DE-thorsten_emotional-medium']];
for (const [ordner, name] of stimmen) for (const ext of ['.onnx.json', '.onnx']) {
  const base = HF + ordner + name;
  const ziel = path.join(dir, name + ext);
  if (fs.existsSync(ziel) && fs.statSync(ziel).size > 1000) { console.log('✔ vorhanden:', ziel); continue; }
  console.log('⬇️  lade', ziel, '…');
  const r = await fetch(base + ext);
  if (!r.ok) throw new Error(`Download fehlgeschlagen (${r.status})`);
  fs.writeFileSync(ziel, Buffer.from(await r.arrayBuffer()));
}
console.log('📦 installiere Piper (Python) …');
execFileSync('python3', ['-m', 'pip', 'install', '--user', 'piper-tts', 'numpy', 'scipy'], { stdio: 'inherit' });
console.log('✅ Stimme bereit.');
