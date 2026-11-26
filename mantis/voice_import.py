# Übernimmt ein externes Voice-over (z. B. ElevenLabs) und erzeugt timeline.json aus Whisper-Wort-Timings
import json, sys, subprocess, wave, numpy as np
SRC, WORDS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
import os
LEAD = 0.25; SR = 44100; SPEED = float(os.environ.get('SPEED', '1.0'))  # >1 = schneller, Tonhöhe bleibt
sents = json.load(open('script.json')); ww = json.load(open(WORDS))
mine = [(i, w) for i, s in enumerate(sents) for w in s.split()]
assert len(mine) == len(ww), (len(mine), len(ww))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter:a', f'atempo={SPEED}', '-ac', '1', '-ar', str(SR), f'{OUT}/el.wav'], check=True)
for x in ww: x['s'] /= SPEED; x['e'] /= SPEED
w = wave.open(f'{OUT}/el.wav'); a = np.frombuffer(w.readframes(w.getnframes()), np.int16)
# Pausen kürzen (MAXGAP_S zwischen Sätzen, MAXGAP_W zwischen Wörtern), mit kurzem Crossfade
MG_S = float(os.environ.get('MAXGAP_S', '99')); MG_W = float(os.environ.get('MAXGAP_W', '99'))
if MG_S < 99 or MG_W < 99:
    cuts = []
    for k in range(len(ww) - 1):
        g = ww[k + 1]['s'] - ww[k]['e']; mg = MG_S if mine[k][0] != mine[k + 1][0] else MG_W
        if g > mg: cuts.append((ww[k]['e'] + mg / 2, ww[k + 1]['s'] - mg / 2))
    af = a.astype(np.float32); out = []; pos = 0; X = int(0.008 * SR)
    for c0, c1 in cuts:
        i0, i1 = int(c0 * SR), int(c1 * SR); seg = af[pos:i0].copy()
        if out and len(seg) > X: seg[:X] *= np.linspace(0, 1, X)
        if len(seg) > X: seg[-X:] *= np.linspace(1, 0, X)
        out.append(seg); pos = i1
    out.append(af[pos:]); a = np.concatenate(out).astype(np.int16)
    def shift(t):
        return t - sum(min(max(0, t - c0), c1 - c0) for c0, c1 in cuts)
    for x in ww: x['s'] = shift(x['s']); x['e'] = shift(x['e'])
    print('gekürzt um', round(sum(c1 - c0 for c0, c1 in cuts), 2), 's')
full = np.concatenate([np.zeros(int(LEAD * SR), np.int16), a, np.zeros(int(0.9 * SR), np.int16)])
o = wave.open(f'{OUT}/voice.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(full.tobytes()); o.close()
tl = []
for i, s in enumerate(sents):
    idx = [k for k, (j, _) in enumerate(mine) if j == i]
    words = [{"w": mine[k][1], "s": ww[k]['s'] + LEAD, "e": ww[k]['e'] + LEAD} for k in idx]
    tl.append({"i": i, "text": s, "start": words[0]['s'], "end": words[-1]['e'], "words": words})
json.dump({"duration": len(full) / SR, "sentences": tl}, open(f'{OUT}/timeline.json', 'w'), ensure_ascii=False, indent=1)
print('dauer', len(full) / SR)
