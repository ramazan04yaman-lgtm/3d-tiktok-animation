"""
SOUND-GENERATOR: erzeugt Hintergrundmusik und Soundeffekte selbst (keine Lizenzprobleme).

Aufruf: python3 tools/sound.py <plan.json> <musik.wav> <effekte.wav> [<stimme.wav>]
plan.json: { "dauer": 45.0,
             "abschnitte": [{"start": 0, "typ": "ruhig"}, {"start": 12, "typ": "treibend"}, {"start": 38, "typ": "drama"}],
             "events": [{"t": 1.2, "typ": "pop"}, ...] }
Effekt-Typen: pop, whoosh, tick, ding, gulp, impact, riser, drop
"""
import json, sys
import numpy as np

SR = 44100
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(d * SR)) / SR
def env(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def lowpass(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    # schnelle Variante über lfilter-ähnliche Rekursion in Blöcken
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)
def highpass(x, cut): return x - lowpass(x, cut)
def note_hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def saw(f, t): return 2 * ((f * t) % 1) - 1

# ------------------------------------------------------------------ Musik-Bausteine
CHORDS = {
    'ruhig':    [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]],   # Am F C G
    'treibend': [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]],
    'drama':    [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]],   # Am F Dm E
}
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT

def pad(chord, d, bright=900):
    t = t_(d); x = np.zeros_like(t)
    for n in chord:
        f = note_hz(n)
        for det in (-0.12, 0.0, 0.11):
            x += saw(f * 2 ** (det / 12), t + rng.random())
    x = lowpass(x / (len(chord) * 3), bright)
    return x * env(len(t), 0.6, 0.8)

def bell(n, d=1.2):
    t = t_(d); f = note_hz(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.01 * f * t)) * np.exp(-t * 3.5)

def pluck(n, d=0.35):
    t = t_(d); f = note_hz(n)
    return lowpass(saw(f, t), 2500) * np.exp(-t * 9)

def bass(n, d):
    t = t_(d); f = note_hz(n - 24)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sign(np.sin(2 * np.pi * f * t))) * env(len(t), 0.01, 0.1)

def kick(d=0.4):
    t = t_(d); f = 50 + 90 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)

def hat(d=0.06):
    n = int(d * SR); return highpass(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR * 60) * 0.5

def tom(d=0.9):
    t = t_(d); f = 70 + 60 * np.exp(-t * 8)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * lowpass(rng.standard_normal(len(t)), 400)) * np.exp(-t * 4)

def add(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += gain * x

def section(typ, d):
    """Rendert einen Musikabschnitt der Länge d (Mono)."""
    buf = np.zeros(int(d * SR) + SR)
    chords = CHORDS[typ]
    bars = int(np.ceil(d / BAR)) + 1
    for b in range(bars):
        c = chords[b % 4]; t0 = b * BAR
        add(buf, pad(c, BAR + 0.8, 700 if typ == 'ruhig' else 1100 if typ == 'treibend' else 600), t0, 0.55 if typ != 'drama' else 0.7)
        if typ == 'ruhig':
            for k, n in enumerate([c[0] + 12, c[2] + 12, c[1] + 24, c[3] + 12]):
                add(buf, bell(n), t0 + k * BEAT, 0.12)
            add(buf, bass(c[0], BAR), t0, 0.25)
        elif typ == 'treibend':
            for k in range(8):
                add(buf, pluck(c[k % 4] + 12), t0 + k * BEAT / 2, 0.16)
                add(buf, hat(), t0 + k * BEAT / 2 + BEAT / 4, 0.25)
            for k in range(4):
                add(buf, kick(), t0 + k * BEAT, 0.55)
                add(buf, bass(c[0], BEAT * 0.9), t0 + k * BEAT, 0.3)
        else:  # drama
            add(buf, bass(c[0], BAR), t0, 0.45)
            for k in (0, 1.5, 2, 3):
                add(buf, tom(), t0 + k * BEAT, 0.5)
            for k in range(4):
                add(buf, bell(c[k % 4] + 12, 0.8), t0 + k * BEAT, 0.08)
    return buf[: int(d * SR)]

def music(plan):
    D = plan['dauer']; n = int(D * SR)
    out = np.zeros(n)
    secs = sorted(plan['abschnitte'], key=lambda s: s['start'])
    for i, s in enumerate(secs):
        a = s['start']; b = secs[i + 1]['start'] if i + 1 < len(secs) else D
        x = section(s['typ'], b - a + 1.0)
        e = np.ones(len(x)); f = int(0.5 * SR)
        if i > 0: e[:f] = np.linspace(0, 1, f)
        if i + 1 < len(secs): e[-int(1.0 * SR):] = np.linspace(1, 0, int(1.0 * SR))
        add(out, x * e, max(0, a - (0.5 if i > 0 else 0)))
    # Ein- und Ausblenden
    out[: int(1.0 * SR)] *= np.linspace(0, 1, int(1.0 * SR))
    out[-int(2.0 * SR):] *= np.linspace(1, 0, int(2.0 * SR))
    return out

# ------------------------------------------------------------------ Effekte
def fx(typ):
    if typ == 'pop':
        t = t_(0.14); f = 400 + 1600 * t / 0.14
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.6
    if typ == 'tick':
        t = t_(0.03); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 200) * 0.35
    if typ == 'ding':
        t = t_(1.0); return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 5) * 0.4
    if typ == 'whoosh':
        d = 0.9; t = t_(d); x = rng.standard_normal(len(t))
        e = np.sin(np.pi * t / d) ** 2
        lo = lowpass(x, 1800); hi = highpass(lo, 300)
        return hi * e * 0.5
    if typ == 'gulp':
        out = np.zeros(int(1.2 * SR))
        for k in range(3):
            t = t_(0.16); f = 320 - 180 * t / 0.16
            g = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18)
            add(out, g, 0.05 + k * 0.33, 0.7)
            add(out, fx('drop') * 0.4, 0.12 + k * 0.33)
        return out
    if typ == 'drop':
        t = t_(0.12); f = 1600 - 1000 * t / 0.12
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.5
    if typ == 'impact':
        t = t_(2.2)
        boom = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
        noise = lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 6)
        return (boom + 0.6 * noise) * 0.9
    if typ == 'riser':
        d = 2.0; t = t_(d); f = 150 + 900 * (t / d) ** 2
        x = 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * highpass(rng.standard_normal(len(t)), 1500) * (t / d)
        return x * (t / d) ** 2 * 0.4
    raise ValueError(typ)

def effects(plan):
    out = np.zeros(int(plan['dauer'] * SR) + 3 * SR)
    for e in plan['events']:
        x = fx(e['typ'])
        start = e['t'] - (2.0 if e['typ'] == 'riser' else 0)
        add(out, x, max(0, start), e.get('lautstaerke', 1.0))
    return out[: int(plan['dauer'] * SR)]

def write(path, mono, gain):
    import wave
    x = mono * gain
    peak = np.max(np.abs(x)) or 1
    if peak > 0.98: x = x * 0.98 / peak
    # leichte Stereo-Breite
    l = x; r = np.concatenate([np.zeros(200), x[:-200]]) if len(x) > 200 else x
    data = (np.stack([l, r], 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())

def read_wav(path):
    import wave
    from scipy.signal import resample_poly
    with wave.open(path) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), '<i2').astype(np.float64) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    if sr != SR:
        from math import gcd
        g = gcd(sr, SR); x = resample_poly(x, SR // g, sr // g)
    return x

def voice_track(plan):
    out = np.zeros(int(plan['dauer'] * SR) + 3 * SR)
    for v in plan.get('stimme', []):
        add(out, read_wav(v['datei']), v['t'])
    return out[: int(plan['dauer'] * SR)]

if __name__ == '__main__':
    plan = json.load(open(sys.argv[1]))
    write(sys.argv[2], music(plan), 0.5)
    write(sys.argv[3], effects(plan), 0.9)
    if len(sys.argv) > 4: write(sys.argv[4], voice_track(plan), 1.0)
    print('Ton erzeugt')
