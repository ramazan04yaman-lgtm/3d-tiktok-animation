"""Legt eine echte Sprachaufnahme auf script.json: python3 ../align.py <audio>  (im Videoordner ausführen)
Erzeugt vo.wav, words.json, timeline.json."""
import json, re, sys, subprocess, numpy as np, os
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
from faster_whisper import WhisperModel
src = sys.argv[1]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', 'vo.wav'], check=True)
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
S = json.load(open('script.json'))
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, language="de", word_timestamps=True, initial_prompt=' '.join(' '.join(x) for x in S))
W = [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for s in segs for w in s.words]
json.dump(W, open('words.json', 'w'), ensure_ascii=False)
n = lambda s: re.sub(r'[^0-9a-zäöüß]', '', s.lower())
num = {'zwanzig': '20', 'zehn': '10', 'sechzig': '60', 'dreiundzwanzig': '23'}
w = [num.get(n(x[0]), n(x[0])) for x in W]
i = 0; starts = []
for sc in S:
    st = []
    for ph in sc:
        f = [num.get(n(x), n(x)) for x in ph.split()][:2]
        j = i
        while j < len(w) and not (w[j] == f[0] and (len(f) < 2 or j + 1 >= len(w) or w[j + 1] == f[1])): j += 1
        if j >= len(w):  # fallback: first word only
            j = i
            while j < len(w) and w[j] != f[0]: j += 1
        if j >= len(w): sys.exit(f"Phrase nicht gefunden: {ph}")
        st.append(W[j][1]); i = j + 1
    starts.append(st)
END = len(a) / 16000
tl = []
for k, st in enumerate(starts):
    s0 = 0 if k == 0 else st[0] - 0.08
    e = starts[k + 1][0] - 0.08 if k + 1 < len(starts) else END + 0.3
    tl.append({'start': round(s0, 3), 'dur': round(e - s0, 3), 'phr': [round(x - s0, 3) for x in st]})
json.dump(tl, open('timeline.json', 'w'))
print("ok", round(END, 1), "s,", len(tl), "Szenen")
