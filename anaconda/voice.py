# Erzeugt Voice-over (Piper, lokal) + timeline.json mit Wort-Timings
import json, subprocess, wave, os, sys, re
import numpy as np
VOICE = sys.argv[1]; OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
sents = json.load(open(os.path.join(os.path.dirname(__file__), "script.json")))
SR = 22050; GAP = 0.18; LEAD = 0.25
def read(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768; return a
def trim(a):
    idx = np.where(np.abs(a) > 0.02)[0]; return a[max(idx[0]-200,0):idx[-1]+400]
chunks = []
for i, s in enumerate(sents):
    p = f"{OUT}/s{i}.wav"
    subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "--length-scale", "0.86", "--sentence-silence", "0.12", "-f", p], input=s.encode(), check=True, capture_output=True)
    chunks.append(trim(read(p)))
# Whisper-Wortalignment
from faster_whisper import WhisperModel
m = WhisperModel("base", compute_type="int8")
timeline = []; t = LEAD; audio = [np.zeros(int(LEAD*SR))]
for i, (s, a) in enumerate(zip(sents, chunks)):
    words = s.split()
    a16 = np.interp(np.arange(0, len(a), SR/16000), np.arange(len(a)), a).astype(np.float32)
    segs, _ = m.transcribe(a16, language="de", word_timestamps=True, initial_prompt=s)
    ww = [w for sg in segs for w in sg.words]
    dur = len(a)/SR
    nz = lambda x: re.sub(r'[^a-zäöüß0-9]', '', x.lower())
    ww = [w for w in ww if w.start < dur + 0.1 and nz(w.word)]
    wc = ''.join(nz(w.word) for w in ww); sc = ''.join(nz(w) for w in words)
    if len(ww) == len(words):
        wt = [(w.start, w.end) for w in ww]
    elif ww and 0.8 < len(wc) / max(1, len(sc)) < 1.25:  # Zeichen-basierte Zuordnung (z. B. "T-Rex" -> "T Rex")
        spans = []; c = 0
        for w in ww: n = len(nz(w.word)); spans.append((c, c + n, w.start, w.end)); c += n
        def at(ch):
            ch = ch * len(wc) / len(sc)
            for a, b, t0, t1 in spans:
                if ch < b: return t0 + (t1 - t0) * max(0, ch - a) / max(1, b - a)
            return spans[-1][3]
        wt = []; c = 0
        for w in words: n = len(nz(w)); wt.append((at(c), at(c + n - 0.01))); c += n
        print('char-align', i)
    else:  # proportional fallback
        print("fallback", i, len(ww), len(words))
        L = np.array([len(re.sub(r'\W','',w))+2 for w in words], float); c = np.concatenate([[0], np.cumsum(L)])/L.sum()*dur
        wt = list(zip(c[:-1], c[1:]))
    timeline.append({"i": i, "text": s, "start": t, "end": t+dur,
                     "words": [{"w": w, "s": t+a0, "e": t+a1} for w, (a0, a1) in zip(words, wt)]})
    audio += [a, np.zeros(int(GAP*SR))]; t += dur + GAP
audio.append(np.zeros(int(1.5*SR)))
full = np.concatenate(audio)
w = wave.open(f"{OUT}/voice.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(full, -1, 1)*32767).astype(np.int16).tobytes()); w.close()
json.dump({"duration": len(full)/SR, "sentences": timeline}, open(f"{OUT}/timeline.json", "w"), ensure_ascii=False, indent=1)
print("dauer", len(full)/SR)
