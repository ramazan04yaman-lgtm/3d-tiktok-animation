"""
Wortgenaue Ausrichtung einer Sprachaufnahme am bekannten Drehbuch-Text (Whisper, offline).
Aufruf: python3 tools/ausrichten.py <audio> <saetze.json> <ergebnis.json>
saetze.json: ["Satz 1", "Satz 2", ...]
ergebnis.json: { "saetze": [{"start": s, "end": s, "woerter": [{"wort": "...", "start": s, "end": s}]}] }
"""
import json, re, sys, difflib
from faster_whisper import WhisperModel

audio, saetze_datei, out = sys.argv[1:4]
saetze = json.load(open(saetze_datei))
norm = lambda w: re.sub(r'[^0-9a-zäöüß]', '', w.lower())

import subprocess, numpy as np
# Audio mit FFmpeg dekodieren (16 kHz mono) – unabhängig von der PyAV-Version
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True, check=True).stdout
samples = np.frombuffer(pcm, '<i2').astype(np.float32) / 32768

model = WhisperModel('small', device='cpu', compute_type='int8')
segs, _ = model.transcribe(samples, language='de', word_timestamps=True, beam_size=5,
                           initial_prompt=' '.join(saetze)[:800])
erkannt = [w for s in segs for w in s.words]
rw = [norm(w.word) for w in erkannt]

# Drehbuch-Wörter mit Satznummer
soll, satz_von = [], []
for i, s in enumerate(saetze):
    for w in s.split():
        if norm(w): soll.append(norm(w)); satz_von.append(i)

# Ausrichtung Drehbuch <-> erkannte Wörter
zeit = [None] * len(soll)
sm = difflib.SequenceMatcher(a=soll, b=rw, autojunk=False)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        zeit[a + k] = (erkannt[b + k].start, erkannt[b + k].end)
# Lücken (nicht erkannte Wörter, z. B. Zahlen) linear auffüllen
bek = [i for i, z in enumerate(zeit) if z]
for i in range(len(zeit)):
    if zeit[i] is None:
        prev = max([j for j in bek if j < i], default=None); nxt = min([j for j in bek if j > i], default=None)
        t0 = zeit[prev][1] if prev is not None else 0.0
        t1 = zeit[nxt][0] if nxt is not None else erkannt[-1].end
        lo = prev if prev is not None else -1; hi = nxt if nxt is not None else len(zeit)
        f = (i - lo) / (hi - lo)
        zeit[i] = (t0 + (t1 - t0) * f, t0 + (t1 - t0) * f)

res = []
for i, s in enumerate(saetze):
    idx = [k for k, sv in enumerate(satz_von) if sv == i]
    woerter = [w for w in s.split() if norm(w)]
    res.append({'start': zeit[idx[0]][0], 'end': zeit[idx[-1]][1],
                'woerter': [{'wort': woerter[j], 'start': zeit[k][0], 'end': zeit[k][1]} for j, k in enumerate(idx)]})
treffer = sum(n for _, _, n in sm.get_matching_blocks())
json.dump({'saetze': res, 'treffer': treffer, 'woerter': len(soll)}, open(out, 'w'), ensure_ascii=False, indent=1)
print(f'Ausrichtung: {treffer}/{len(soll)} Wörter sicher erkannt')
