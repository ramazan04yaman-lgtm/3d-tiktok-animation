# External voice-over (e.g. ElevenLabs) -> build/voice.wav + build/timeline.json
# usage: python3 ext_voice.py <audio file>   (text must match script.json)
# Word timings come from faster-whisper; overly long silences are shortened (voice itself is untouched).
import json, subprocess, sys, os, re, wave, numpy as np
src = sys.argv[1]; os.makedirs('build/ext', exist_ok=True)
SR = 44100; TAIL = float(os.environ.get('TAIL', '3.6')); LEAD = 0.12
S = json.load(open('script.json'))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
A = np.frombuffer(raw, np.float32).copy()
cache = 'build/ext/whisper.json'
if os.path.exists(cache) and os.environ.get('RECACHE') is None:
    ww = json.load(open(cache))
else:
    from faster_whisper import WhisperModel
    a16 = np.interp(np.arange(0, len(A), SR / 16000), np.arange(len(A)), A).astype(np.float32)
    m = WhisperModel('small', device='cpu', compute_type='int8')
    segs, _ = m.transcribe(a16, language='de', word_timestamps=True, initial_prompt=' '.join(s['say'] for s in S))
    ww = [(x.word.strip(), x.start, x.end) for sg in segs for x in sg.words]
    json.dump(ww, open(cache, 'w'), ensure_ascii=False)
caps = [w for s in S for w in s['cap'].split()]
# align script words to whisper words (tolerates spelling/tokenisation differences like '5.000' or 'kapten')
import difflib
nz = lambda x: re.sub(r'[^a-zäöüß0-9]', '', x.lower())
tm = [None] * len(caps)
for op, a0, a1, b0, b1 in difflib.SequenceMatcher(None, [nz(w) for w in caps], [nz(w[0]) for w in ww], autojunk=False).get_opcodes():
    if op == 'equal':
        for k in range(a1 - a0): tm[a0 + k] = (ww[b0 + k][1], ww[b0 + k][2])
    elif op == 'replace':
        t0, t1 = ww[b0][1], ww[b1 - 1][2]; n = a1 - a0
        for k in range(n): tm[a0 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    if op != 'equal': print('align', op, caps[a0:a1], [w[0] for w in ww[b0:b1]])
for k in range(len(tm)):  # words whisper missed: squeeze between neighbours
    if tm[k] is None:
        p0 = tm[k - 1][1] if k else 0.0; tm[k] = (p0, p0 + 0.2)
ww = [(caps[k], tm[k][0], tm[k][1]) for k in range(len(caps))]
# sentence index per word
sid = [i for i, s in enumerate(S) for _ in s['cap'].split()]
# shorten gaps: inside a sentence max 0.45 s, between sentences max 0.35 + pause (script pacing)
keep = []; t = ww[0][1] - 0.05; out_t = []; shift = 0.0; pieces = []
cur = max(0.0, ww[0][1] - 0.08)
for k in range(len(ww)):
    if k:
        g0, g1 = ww[k - 1][2], ww[k][1]; gap = g1 - g0
        mx = 0.45 if sid[k] == sid[k - 1] else 0.35 + S[sid[k - 1]].get('pause', 0.12) + 0.2
        if gap > mx:
            cut0 = g0 + (mx / 2); cut1 = g1 - (mx / 2)  # remove the middle of the silence
            pieces.append((cur, cut0)); shift += cut1 - cut0; cur = cut1
    out_t.append((ww[k][1] - shift, ww[k][2] - shift))
end = min(len(A) / SR, ww[-1][2] + 0.35); pieces.append((cur, end))
fade = int(0.01 * SR); segs = []
for a, b in pieces:
    x = A[int(a * SR):int(b * SR)].copy()
    if len(x) > 2 * fade: x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    segs.append(x)
base = pieces[0][0]
V = np.concatenate([np.zeros(int(LEAD * SR), np.float32)] + segs + [np.zeros(int(TAIL * SR), np.float32)])
V = V / np.abs(V).max() * 0.95
off = LEAD - base
w = wave.open('build/voice.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((V * 32767).astype(np.int16).tobytes())
tl = []; k = 0
for i, s in enumerate(S):
    n = len(s['cap'].split()); wl = []
    for j in range(n):
        t0, t1 = out_t[k + j]; wl.append({'w': caps[k + j].strip(',.:'), 't0': round(t0 + off, 3), 't1': round(t1 + off, 3)})
    tl.append({'t0': wl[0]['t0'], 't1': wl[-1]['t1'], 'shots': s['shots'], 'words': wl}); k += n
D = round(len(V) / SR, 3)
json.dump({'duration': D, 'sentences': tl}, open('build/timeline.json', 'w'), indent=1, ensure_ascii=False)
print('orig', round(len(A) / SR, 2), 's -> voice', D, 's (removed', round(shift, 2), 's silence)')
