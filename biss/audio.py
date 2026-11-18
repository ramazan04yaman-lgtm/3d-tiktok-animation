# Eigene Musik + Soundeffekte für das Biss-Duell (komplett synthetisiert)
import json, wave, numpy as np
from scipy.signal import lfilter, butter
SR = 44100
TL = json.load(open('build/timeline.json')); R = TL['rounds']; DUR = TL['duration']
N = int(DUR * SR); t = np.arange(N) / SR; rng = np.random.default_rng(3)
def note(m): return 440 * 2 ** ((m - 69) / 12)
def bp(x, lo, hi, o=2): b, a = butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def lpf(x, f, o=2): b, a = butter(o, f / (SR / 2)); return lfilter(b, a, x)
def hpf(x, f, o=2): b, a = butter(o, f / (SR / 2), 'high'); return lfilter(b, a, x)
mus = np.zeros(N); sfx = np.zeros(N)
def put(buf, sig, start, gain=1.0):
    i = int(start * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    j = min(N, i + len(sig)); buf[i:j] += gain * sig[:j - i]
def env(n, a=0.005, d=0.2):
    tt = np.arange(n) / SR; return np.minimum(1, tt / a) * np.exp(-tt / d)
# ---------- Musik: 124 BPM, treibend, Moll ----------
bpm = 124; beat = 60 / bpm; bar = 4 * beat
prog = [45, 41, 48, 43]  # A, F, C, G (Bass-Grundtöne)
END = R[-1]['crush']  # bis zum Megalodon-Biss läuft der Beat, danach Finale
def kick():
    n = int(0.35 * SR); tt = np.arange(n) / SR; f = 45 + 110 * np.exp(-tt * 35)
    return 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 8)
def clap():
    n = int(0.25 * SR); x = rng.standard_normal(n); x = bp(x, 900, 5000) * env(n, 0.002, 0.07); return 0.5 * x
def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); x = hpf(rng.standard_normal(n), 7000) * env(n, 0.001, 0.06 if open_ else 0.015); return 0.25 * x
def bass(m, d):
    n = int(d * SR); tt = np.arange(n) / SR; f = note(m); s = 2 * ((f * tt) % 1) - 1
    return 0.35 * lpf(s, 500) * np.minimum(1, tt / 0.005) * np.exp(-tt * 3)
def pluck(m, d=0.25, v=0.12):
    n = int(d * SR); tt = np.arange(n) / SR; f = note(m)
    s = np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 + np.sin(2 * np.pi * f * 2 * tt) * 0.3
    return v * lpf(s, 3000) * np.minimum(1, tt / 0.003) * np.exp(-tt * 14)
arp = [0, 7, 12, 15, 12, 7, 3, 7]
nb = int(END / bar) + 2
for b in range(nb):
    t0 = 0.0 + b * bar; root = prog[b % 4]; minor = b % 4 in (0,)
    for k in range(4):
        tb = t0 + k * beat
        if tb > END: break
        put(mus, kick(), tb); put(mus, hat(), tb + beat / 2)
        if k in (1, 3): put(mus, clap(), tb)
        put(mus, bass(root, beat * 0.45), tb); put(mus, bass(root + 12, beat * 0.3), tb + beat / 2, 0.7)
    for k in range(8):
        ts = t0 + k * beat / 2
        if ts > END: break
        third = 3 if root in (45,) else 4 if root in (41, 48, 43) else 3
        iv = [0, 7, 12, 12 + third, 12, 7, third, 7][k]
        put(mus, pluck(root + 24 + iv), ts)
mus *= np.minimum(1, t / 0.4)
# kurzes Stoppen vor dem Megalodon-Biss (Spannung), dann Finale-Akkord
cut = R[-1]['tb'] - 0.05; mus[int(cut * SR):] *= 0
fin = R[-1]['crush']
for m, d in [(45, 3.5), (52, 3.5), (57, 3.5), (60, 3.5), (64, 3.5)]:
    n = int(d * SR); tt = np.arange(n) / SR; s = sum(2 * ((note(m) * (1 + det) * tt) % 1) - 1 for det in (-0.004, 0.004))
    put(mus, 0.06 * lpf(s, 2500) * np.minimum(1, tt / 0.02) * np.exp(-tt * 0.7), fin + 0.05)
for k, m in enumerate([69, 72, 76, 81]): put(mus, pluck(m, 0.6, 0.18), fin + 0.6 + k * 0.12)
# ---------- SFX ----------
def whoosh(d=0.4, up=True):
    n = int(d * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n)
    lo = bp(x, 250, 900); hi = bp(x, 1200, 4500); k = tt / d if up else 1 - tt / d
    return 0.6 * ((1 - k) * lo + k * hi) * np.sin(np.pi * tt / d) ** 2
def snap():  # Kiefer schnappt zu
    n = int(0.12 * SR); x = bp(rng.standard_normal(n), 1500, 6000) * env(n, 0.001, 0.02); tt = np.arange(n) / SR
    return 0.8 * x + 0.5 * np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 40)
def thump(f=60, d=0.5, v=1.0):
    n = int(d * SR); tt = np.arange(n) / SR; fr = f + 80 * np.exp(-tt * 25); return v * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 6)
def crunch(d=0.5, lo=300, hi=4000, dens=60):  # viele kleine Knackser
    n = int(d * SR); out = np.zeros(n)
    for _ in range(int(dens * d)):
        i = rng.integers(0, n - 2000); m = rng.integers(300, 2000); out[i:i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (m / 5)) * rng.uniform(0.3, 1)
    return 0.6 * bp(out, lo, hi) * np.exp(-np.arange(n) / SR / (d * 0.6))
def metal(f0=320, d=1.2, v=0.5):  # metallisches Klingen
    n = int(d * SR); tt = np.arange(n) / SR; s = sum(a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt * dmp) for r, a, dmp in [(1, 1, 3), (2.76, 0.6, 4), (5.4, 0.4, 6), (8.93, 0.25, 8)])
    return v * s * np.minimum(1, tt / 0.001)
def creak(d=0.6):  # Ächzen unter Druck
    n = int(d * SR); tt = np.arange(n) / SR; f = 90 + 30 * np.sin(tt * 23) + 40 * tt; s = 2 * ((np.cumsum(f) / SR) % 1) - 1
    return 0.25 * bp(s * (1 + 0.5 * rng.standard_normal(n) * 0.2), 150, 1800) * np.sin(np.pi * tt / d)
def glass(d=0.8):
    n = int(d * SR); out = np.zeros(n)
    for _ in range(25):
        i = rng.integers(0, n // 2); m = int(0.15 * SR); tt = np.arange(m) / SR; f = rng.uniform(2500, 6000); seg = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 30) * 0.2
        j = min(n, i + m); out[i:j] += seg[:j - i]
    return out
def buzzer(d=0.45):
    n = int(d * SR); tt = np.arange(n) / SR; s = np.sign(np.sin(2 * np.pi * 110 * tt)) + 0.5 * np.sign(np.sin(2 * np.pi * 116 * tt))
    return 0.13 * lpf(s, 1500) * np.minimum(1, tt / 0.01) * np.minimum(1, (d - tt) / 0.05)
def ding():
    n = int(0.9 * SR); tt = np.arange(n) / SR; return 0.22 * (np.sin(2 * np.pi * 1318 * tt) + 0.5 * np.sin(2 * np.pi * 1976 * tt)) * np.exp(-tt * 5)
def riser(d):
    n = int(d * SR); tt = np.arange(n) / SR; f = 200 + 900 * (tt / d) ** 2; return 0.12 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (tt / d)
def pop():
    n = int(0.12 * SR); tt = np.arange(n) / SR; f = 500 + 900 * np.exp(-tt * 40); return 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30)
def slide(d=0.45):
    n = int(d * SR); tt = np.arange(n) / SR; x = bp(rng.standard_normal(n), 200, 1200) * 0.25; rattle = (np.sin(2 * np.pi * 28 * tt) > 0.6) * 0.15 * bp(rng.standard_normal(n), 1500, 5000)
    return (x + rattle) * np.sin(np.pi * tt / d)
def mx(*sig):
    n = max(len(x) for x in sig); o = np.zeros(n)
    for x in sig: o[:len(x)] += x
    return o
CRUSH = {'kokos': lambda: mx(crunch(0.5, 400, 3500, 80), thump(90, 0.3, 0.6)),
         'bowling': lambda: mx(crunch(0.6, 300, 5000, 50), thump(70, 0.4, 0.8), metal(900, 0.3, 0.08)),
         'auto': lambda: mx(crunch(0.8, 200, 3000, 70), metal(260, 0.8, 0.25), glass(0.9), thump(55, 0.5, 0.9)),
         'tresor': lambda: mx(crunch(0.8, 150, 2500, 60), metal(180, 1.2, 0.35), thump(45, 0.6, 1.0)),
         'container': lambda: mx(crunch(1.4, 80, 2200, 90), metal(120, 2.0, 0.4), metal(210, 1.6, 0.25), thump(35, 1.2, 1.3))}
HOLD = {'bowling': (700, 0.25), 'auto': (330, 0.35), 'tresor': (230, 0.45), 'container': (150, 0.5)}
put(sfx, pop(), 0.05, 0.8); put(sfx, whoosh(0.35), 1.15, 0.6); put(sfx, slide(0.5), 1.2, 0.8)
for r in R:
    put(sfx, whoosh(0.5), r['t0'], 0.8)
    put(sfx, snap(), r['tb'] + 0.08, 0.9); put(sfx, riser(r['crush'] - r['tb']), r['tb'], 0.8); put(sfx, creak(r['crush'] - r['tb']), r['tb'] + 0.12, 0.9)
    big = 1.5 if r['id'] == 'mega' else 1.0
    put(sfx, CRUSH[r['A']](), r['crush'], 0.9 * big); put(sfx, ding(), r['crush'] + 0.08, 0.9)
    if r['B']:
        put(sfx, slide(0.5), r['swap'], 0.9)
        put(sfx, snap(), r['tf'] + 0.08, 0.9); f0, v = HOLD[r['B']]; put(sfx, metal(f0, 1.0, v), r['tf'] + 0.12); put(sfx, creak(0.8), r['tf'] + 0.15, 1.0)
        put(sfx, buzzer(), r['tf'] + 0.35); put(sfx, whoosh(0.4, False), r['exit'], 0.6)
    else:
        put(sfx, pop(), r['final'], 1.0); put(sfx, whoosh(0.3), r['final'] + 1.35, 0.4)
mix = 0.55 * mus + 0.9 * sfx
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.89 / np.max(np.abs(mix)); mix *= np.minimum(1, (DUR - t) / 0.4)
st = np.stack([mix, mix], 1)
with wave.open('build/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('ok', DUR)
