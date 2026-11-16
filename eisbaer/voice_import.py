# Übernimmt ein externes Voice-over (z. B. ElevenLabs) und erzeugt timeline.json aus Whisper-Wort-Timings
import json, sys, subprocess, wave, numpy as np
SRC, WORDS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
LEAD = 0.25; SR = 44100
sents = json.load(open('script.json')); ww = json.load(open(WORDS))
mine = [(i, w) for i, s in enumerate(sents) for w in s.split()]
assert len(mine) == len(ww), (len(mine), len(ww))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-ac', '1', '-ar', str(SR), f'{OUT}/el.wav'], check=True)
w = wave.open(f'{OUT}/el.wav'); a = np.frombuffer(w.readframes(w.getnframes()), np.int16)
full = np.concatenate([np.zeros(int(LEAD * SR), np.int16), a, np.zeros(int(1.2 * SR), np.int16)])
o = wave.open(f'{OUT}/voice.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(full.tobytes()); o.close()
tl = []
for i, s in enumerate(sents):
    idx = [k for k, (j, _) in enumerate(mine) if j == i]
    words = [{"w": mine[k][1], "s": ww[k]['s'] + LEAD, "e": ww[k]['e'] + LEAD} for k in idx]
    tl.append({"i": i, "text": s, "start": words[0]['s'], "end": words[-1]['e'], "words": words})
json.dump({"duration": len(full) / SR, "sentences": tl}, open(f'{OUT}/timeline.json', 'w'), ensure_ascii=False, indent=1)
print('dauer', len(full) / SR)
