"""Legt eine echte Sprachaufnahme auf script.json: python3 ../align.py <audio>  (im Videoordner ausführen)
Erzeugt vo.wav, words.json, timeline.json."""
import json, re, sys, subprocess, numpy as np, os, difflib
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
from faster_whisper import WhisperModel
src = sys.argv[1]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', 'vo.wav'], check=True)
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
S = json.load(open('script.json'))
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, language="de", word_timestamps=True, initial_prompt=' '.join(' '.join(x) for x in S))
W = [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for s in segs for w in s.words]
script_words = {re.sub(r'[^0-9a-zäöüß]', '', x.lower()) for sc in S for ph in sc for x in ph.split()}
for w in W:
    if w[0].lower().startswith('folgt') and 'folg' in script_words and 'folgt' not in script_words: w[0] = 'folg' + w[0][5:]
W2 = []
for w in W:
    if w[0].startswith('-') and W2: W2[-1][0] += w[0]; W2[-1][2] = w[2]; continue
    W2.append(w)
W = W2
_n = lambda x: re.sub(r'[^0-9a-zäöüß]', '', x.lower())
stoks = [x for sc in S for ph in sc for x in ph.split()]
sm = difflib.SequenceMatcher(None, [_n(x[0]) for x in W], [_n(x) for x in stoks], autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'replace' and i2 - i1 == j2 - j1:
        for k in range(i2 - i1): W[i1 + k][0] = stoks[j1 + k]
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
        sim = lambda a, b: a == b or (len(a) > 1 and len(b) > 1 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.75)
        while j < len(w) and not (sim(w[j], f[0]) and (len(f) < 2 or j + 1 >= len(w) or sim(w[j + 1], f[1]))): j += 1
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
