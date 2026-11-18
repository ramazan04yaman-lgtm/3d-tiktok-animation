# Synthetisiert eigene Hintergrundmusik + SFX und mischt sie mit dem Voice-over
import json, wave, re, numpy as np
SR = 44100
TL = json.load(open('build/timeline.json')); S = TL['sentences']; DUR = TL['duration']
N = int(DUR * SR); t = np.arange(N) / SR
rng = np.random.default_rng(1)
def WT(i, pre):
    for w in S[i]['words']:
        if re.sub(r'[^a-zäöüß0-9]', '', w['w'].lower()).startswith(pre): return w['s']
    return S[i]['start']
def lp(x, a):  # einfacher Tiefpass
    y = np.empty_like(x); acc = 0.0
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)
def note(f): return 440 * 2 ** ((f - 69) / 12)
# ---- Musik: 100 BPM, Am F C G, Pizzicato-Arpeggio + Pad + Bass ----
bpm = 100; beat = 60 / bpm; bar = beat * 4
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
mus = np.zeros(N)
def add(sig, start):
    i = int(start * SR); 
    if i >= N: return
    j = min(N, i + len(sig)); mus[i:j] += sig[:j - i]
def pluck(f, d=0.5, v=0.25):
    tt = np.arange(int(d * SR)) / SR; env = np.exp(-tt * 9) * (1 - np.exp(-tt * 400))
    return v * env * (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.1 * np.sin(6 * np.pi * f * tt))
def pad(fs, d, v=0.07):
    tt = np.arange(int(d * SR)) / SR; s = np.zeros_like(tt)
    for f in fs:
        for det in (-0.12, 0.12):
            ph = 2 * np.pi * f * (1 + det / 100) * tt; s += 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = lp(s, 0.04); env = np.minimum(1, tt / 0.6) * np.minimum(1, (d - tt) / 0.6)
    return v * s * env / len(fs)
nb = int(DUR / bar) + 1
pattern = [0, 1, 2, 1, 0, 2, 1, 2]
for b in range(nb):
    c = chords[b % 4]; t0 = b * bar
    add(pad([note(n) for n in c], bar + 0.4), t0)
    add(pluck(note(c[0] - 24), 1.2, 0.35) * 0.6, t0); add(pluck(note(c[0] - 24), 1.2, 0.3) * 0.5, t0 + 2 * beat)
    for k in range(8):
        n = c[pattern[k]] + 12 + (12 if k == 7 else 0)
        add(pluck(note(n), 0.45, 0.13 if k % 2 else 0.17), t0 + k * beat / 2)
    for k in range(8):  # leise Hi-Hat
        hl = int(0.05 * SR); hh = rng.standard_normal(hl) * np.exp(-np.arange(hl) / SR * 80); hh = hh - lp(hh, 0.3)
        add(hh * (0.035 if k % 2 else 0.02), t0 + k * beat / 2)
    for k in (0, 2):  # weicher Kick
        kl = int(0.3 * SR); kt = np.arange(kl) / SR; f = 50 + 70 * np.exp(-kt * 30)
        add(0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-kt * 9), t0 + k * beat)
fade = np.minimum(1, t / 0.3) * np.minimum(1, (DUR - t) / 1.2); mus *= fade
# ---- SFX ----
sfx = np.zeros(N)
def addS(sig, start, g=1):
    i = int(start * SR); j = min(N, i + len(sig)); 
    if i < N: sfx[i:j] += g * sig[:j - i]
def whoosh(d=0.45):
    n = int(d * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n)
    a = 0.02 + 0.25 * np.sin(np.pi * tt / d) ** 2; y = np.zeros(n); acc = 0
    from scipy.signal import lfilter
    # zeitvariabler Tiefpass grob in Blöcken
    out = np.zeros(n); B = 512
    for i in range(0, n, B):
        aa = a[i]; out[i:i + B] = lfilter([aa], [1, aa - 1], x[i:i + B])
    return out * np.sin(np.pi * tt / d) ** 2 * 1.6
def pop():
    n = int(0.12 * SR); tt = np.arange(n) / SR; f = 900 * np.exp(-tt * 18) + 300
    return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30)
def crack():
    n = int(1.2 * SR); x = np.zeros(n)
    for k in range(14):
        i = int(rng.uniform(0, 0.7) * SR); l = int(0.04 * SR); x[i:i + l] += rng.standard_normal(l) * np.exp(-np.arange(l) / SR * 120) * rng.uniform(0.4, 1)
    tt = np.arange(n) / SR; x += 0.6 * np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 5) * rng.standard_normal(n) * 0.3
    return x * 0.9
def splash():
    n = int(1.0 * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n); x = x - lp(x, 0.2)
    return 0.6 * x * np.exp(-tt * 4) * np.minimum(1, tt / 0.02)
def sparkle():
    n = int(1.0 * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for k, f in enumerate([1568, 2093, 2637, 3136]):
        d = int(k * 0.07 * SR); s[d:] += 0.08 * np.sin(2 * np.pi * f * tt[:n - d]) * np.exp(-tt[:n - d] * 6)
    return s
def roar(d=1.8):
    n = int(d * SR); tt = np.arange(n) / SR; f0 = 70 + 25 * np.sin(np.pi * tt / d)
    ph = 2 * np.pi * np.cumsum(f0) / SR; x = sum(np.sin(k * ph) / k for k in range(1, 12))
    x = x * (1 + 0.6 * rng.standard_normal(n)); x = lp(x, 0.08)
    env = np.minimum(1, tt / 0.15) * np.minimum(1, (d - tt) / 0.5); return 0.9 * x * env / np.abs(x).max()
def thud():
    n = int(0.6 * SR); tt = np.arange(n) / SR; return 0.9 * np.sin(2 * np.pi * (40 + 40 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 6) + 0.2 * lp(rng.standard_normal(n), 0.05) * np.exp(-tt * 8)
def step():  # schwerer Dino-Schritt: tiefer Schlag + Erdrieseln
    n = int(0.5 * SR); tt = np.arange(n) / SR
    return 1.0 * np.sin(2 * np.pi * (34 + 46 * np.exp(-tt * 18)) * tt) * np.exp(-tt * 9) + 0.25 * lp(rng.standard_normal(n), 0.08) * np.exp(-tt * 14)
def flesh():  # Biss ins Fleisch: dumpfer Schlag + nasses Reißen
    n = int(0.7 * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n); wet = lp(x, 0.25) - lp(x, 0.02)
    wob = 0.5 + 0.5 * np.sin(2 * np.pi * 23 * tt + 3 * np.sin(2 * np.pi * 5 * tt))
    return 0.9 * wet * wob * np.exp(-tt * 5) * np.minimum(1, tt / 0.01) + 0.8 * np.sin(2 * np.pi * (55 + 60 * np.exp(-tt * 20)) * tt) * np.exp(-tt * 10)
tH0 = WT(0, 'schlägt') + 0.12; tSn = WT(0, 'knickt') - 0.05
tH2 = WT(2, 'kracht') + 0.05; tBr = WT(2, 'bricht') - 0.05
tH4 = WT(4, 'schlag') + 0.05; tH7 = WT(7, 'schlag') + 0.05; tB6 = S[6]['end'] - 0.25
for i, s in enumerate(S[1:], 1): addS(whoosh(), s['start'] - 0.2, 0.45)
for i, pre in [(0, 'knochenkeule'), (0, 'weich'), (1, 'wirbel'), (1, 'knochenstiel'), (2, 'nichts'), (3, 'sehnen'), (3, 'stahl'), (4, 'aus'), (4, 'steif'), (5, 'locker'), (5, 'scharnier'), (6, 'knochenplatten'), (6, 'stacheln'), (8, 'ankylo')]:
    addS(pop(), WT(i, pre))
for th in (tH0, tH2, tH4, tH7): addS(whoosh(0.4), th - 0.38, 0.9); addS(thud(), th, 0.9)
addS(crack(), tSn, 1.0); addS(flesh(), tSn, 0.6)
addS(crack(), tBr, 1.0); addS(flesh(), tBr, 0.4)
addS(sparkle(), WT(1, 'verwachs') + 1.4, 0.5); addS(whoosh(0.8), WT(3, 'wickeln'), 0.4)
tP = WT(5, 'peitscht')
for k in range(8):
    t0 = S[5]['start'] + 0.3 + k * 0.95
    if t0 < S[5]['end']: addS(whoosh(0.35), t0 if t0 < tP else tP + (t0 - tP) * 0.55, 0.55)
addS(crack(), tB6, 0.5); addS(pop(), tB6, 0.6)
st = S[7]['start'] + 0.1
while st < tH7 - 0.4: addS(step(), st, 0.6); st += 0.5
addS(crack(), tH7, 1.0); addS(flesh(), tH7 + 0.02, 0.7); addS(thud(), tH7 + 1.35, 1.0); addS(step(), tH7 + 1.35, 0.8)
addS(sparkle(), WT(8, 'gebaut'), 0.7)
# Urwald-Ambiente: leiser Wind + Vogelzwitschern
wn = rng.standard_normal(N); sfx += lp(wn, 0.01) * 0.5
for k in range(int(DUR / 1.7)):
    t0 = rng.uniform(0, DUR - 1); n = int(0.09 * SR); tt = np.arange(n) / SR; f = rng.uniform(2500, 4200)
    for j in range(rng.integers(2, 5)):
        addS(0.05 * np.sin(2 * np.pi * (f + 1500 * tt / 0.09) * tt) * np.sin(np.pi * tt / 0.09), t0 + j * 0.13)
# ---- Voice ----
w = wave.open('build/voice.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
v = np.interp(np.arange(N) * (w.getframerate() / SR), np.arange(len(v)), v)
v = v / (np.abs(v).max() + 1e-9) * 0.9
env = lp(np.abs(v), 0.0008); duck = 1 - 0.45 * np.clip(env / (env.max() * 0.35), 0, 1)
mus = mus / (np.abs(mus).max() + 1e-9)
mix = v + mus * 0.22 * duck + sfx * 0.55
mix = mix / np.abs(mix).max() * 0.95
o = wave.open('build/mix.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((mix * 32767).astype(np.int16).tobytes()); o.close()
m = wave.open('build/music_only.wav', 'wb'); m.setnchannels(1); m.setsampwidth(2); m.setframerate(SR); m.writeframes((mus * 0.9 * 32767).astype(np.int16).tobytes()); m.close()
print('ok', DUR)
