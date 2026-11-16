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
for i, s in enumerate(S[1:], 1): addS(whoosh(), s['start'] - 0.2, 0.5)
addS(whoosh(0.6), WT(0, 'robbe') - 0.25, 0.4)
for i, pre in [(0, 'entfernung'), (1, 'abend'), (2, 'weiß'), (3, 'hohl'), (3, 'schnee'), (4, 'minus'), (6, 'zentim'), (6, 'schlaf'), (7, 'dünn'),
               (8, 'teller'), (9, 'ausrut'), (11, 'meter'), (11, 'riech'), (12, 'gehst'), (13, 'eisb')]:
    addS(pop(), WT(i, pre))
addS(splash(), S[1]['start'] + 0.75); addS(crack(), WT(7, 'bricht') - 0.35, 1.0)
addS(sparkle(), WT(2, 'fell') - 0.15, 0.8); addS(sparkle(), WT(13, 'eisb'), 1.0)
# Wind-Bett
wn = rng.standard_normal(N); wind = lp(wn, 0.015); g = 0.5 + 0.5 * np.sin(t * 0.7) * np.sin(t * 0.23)
lvl = np.full(N, 0.6)
for i, v in [(4, 1.6), (12, 2.2), (3, 0.15), (9, 0.15)]:
    a, b = int(S[i]['start'] * SR), int((S[i]['end'] + 0.18) * SR); lvl[a:b] = v
lvl = lp(lvl, 0.0003); sfx += wind * g * lvl * 2.2
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
