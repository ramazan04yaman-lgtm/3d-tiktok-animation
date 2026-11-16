"""Soundeffekte, komplett per Code synthetisiert (44.1 kHz, mono float)."""
import numpy as np

SR = 44100
R = np.random.default_rng(7)


def _t(d):
    return np.arange(int(SR * d)) / SR


def noise(d):
    return R.normal(0, 1, int(SR * d))


def lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(0, len(x), 1):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lpf(x, cutoff):  # schneller: FFT-Tiefpass
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def bpf(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (f / hi) ** 4)) * (1 / (1 + (lo / np.maximum(f, 1)) ** 4))
    return np.fft.irfft(X, len(x))


def norm(x, peak=0.9):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


def whoosh(d=0.45):
    t = _t(d)
    env = np.sin(np.pi * t / d) ** 2
    return norm(bpf(noise(d), 300, 2500) * env, 0.6)


def boom(d=2.5, f0=48):
    t = _t(d)
    s = np.sin(2 * np.pi * (f0 + 70 * np.exp(-t * 14)) * t) * np.exp(-t * 2.0)
    s += 0.3 * lpf(noise(d), 200) * np.exp(-t * 6)
    return norm(s, 0.95)


def vibrate(d=0.9):
    t = _t(d)
    buzz = np.sign(np.sin(2 * np.pi * 165 * t)) * 0.6 + np.sin(2 * np.pi * 330 * t) * 0.3
    gate = ((t % 0.45) < 0.32).astype(float)
    return norm(lpf(buzz * gate, 1400), 0.5)


def ping():
    out = np.zeros(int(SR * 0.9))
    for k, (f, st) in enumerate([(1318.5, 0.0), (1760, 0.12)]):
        t = _t(0.7)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 12)
        i = int(st * SR)
        out[i:i + len(s)] += s
    return norm(out, 0.5)


def error_beep():
    t = _t(0.35)
    s = np.sign(np.sin(2 * np.pi * 220 * t)) * np.exp(-t * 4)
    return norm(lpf(s, 1800), 0.35)


def knock():
    t = _t(0.25)
    s = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 35) + 0.6 * bpf(noise(0.25), 300, 1800) * np.exp(-t * 60)
    return norm(s, 0.9)


def step():
    t = _t(0.18)
    s = np.sin(2 * np.pi * 80 * t) * np.exp(-t * 40) + 0.5 * bpf(noise(0.18), 200, 2500) * np.exp(-t * 45)
    return norm(s, 0.6)


def creak(d=1.4):
    t = _t(d)
    f = 260 + 120 * np.sin(2 * np.pi * 0.7 * t) + 40 * R.normal(0, 1, len(t)).cumsum() / np.sqrt(len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    grit = (np.sin(2 * np.pi * 38 * t) > 0.3).astype(float) * 0.7 + 0.3
    s = np.sign(np.sin(ph)) * grit * np.sin(np.pi * t / d)
    return norm(bpf(s, 300, 3000), 0.45)


def engine(d):
    t = _t(d)
    s = sum(np.sin(2 * np.pi * 31 * h * t + h) / h for h in range(1, 8)) * (0.7 + 0.3 * np.sin(2 * np.pi * 15.5 * t))
    s = lpf(s, 400) + 0.1 * lpf(noise(d), 300)
    env = np.minimum(1, np.minimum(t / 0.3, (d - t) / 0.3))
    return norm(s * env, 0.4)


def wind(d):
    t = _t(d)
    s = lpf(noise(d), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t))
    env = np.minimum(1, np.minimum(t / 0.5, (d - t) / 0.5))
    return norm(s * env, 0.3)


def powerdown():
    d = 2.0
    t = _t(d)
    f = 220 * np.exp(-t * 1.6) + 25
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.0)
    s += 0.6 * np.sin(2 * np.pi * 2 * np.cumsum(f) / SR) * np.exp(-t * 1.5)
    s[:int(SR * 0.05)] += 0.8 * noise(0.05)
    return norm(s, 0.8)


def spark(d=0.7):
    t = _t(d)
    gate = (R.random(len(t)) < 0.02).astype(float)
    s = bpf(noise(d) * 0.3 + gate * 4, 1500, 8000) * np.exp(-t * 3)
    return norm(s, 0.4)


def growl(d=1.8):
    t = _t(d)
    s = bpf(noise(d), 70, 450) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t)) + 0.4 * np.sin(2 * np.pi * (75 + 8 * np.sin(2 * np.pi * 3 * t)) * t)
    env = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.3)
    return norm(s * env, 0.8)


def bark():
    d = 0.32
    t = _t(d)
    f = 520 * np.exp(-t * 4) + 180
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(h * ph) / h for h in range(1, 6)) + 0.4 * bpf(noise(d), 500, 3000)
    return norm(s * np.exp(-t * 9) * np.minimum(1, t / 0.01), 0.85)


def flies(d):
    t = _t(d)
    out = np.zeros(len(t))
    for k in range(3):
        f = 210 + k * 37 + 12 * np.sin(2 * np.pi * (0.7 + k * 0.3) * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        out += (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.4 + k * 0.2) * t + k))
    env = np.minimum(1, np.minimum(t / 0.3, (d - t) / 0.3))
    return norm(out * env, 0.25)


def whisper(d=1.2):
    t = _t(d)
    s = bpf(noise(d), 1800, 7000)
    syl = np.clip(np.sin(2 * np.pi * (5 + R.random() * 2) * t + R.random() * 6), 0, 1) ** 2
    return norm(s * syl * np.sin(np.pi * t / d), 0.35)


def heartbeat(bpm, d):
    out = np.zeros(int(SR * d))
    beat = 60 / bpm
    t = _t(0.25)
    h = np.sin(2 * np.pi * 52 * t) * np.exp(-t * 28)
    x = 0.0
    while x < d - 0.4:
        for off, v in ((0, 1.0), (0.24, 0.7)):
            i = int((x + off) * SR)
            out[i:i + len(h)] += v * h[:len(out) - i]
        x += beat
    return norm(out, 0.7)


def tinnitus(d):
    t = _t(d)
    return norm(np.sin(2 * np.pi * 3520 * t) * np.minimum(1, t / d * 2) * np.minimum(1, (d - t) / 0.2), 0.06)


def birds(d):
    out = np.zeros(int(SR * d))
    x = 0.2
    while x < d - 0.4:
        n = R.integers(2, 4)
        for k in range(n):
            t = _t(0.09)
            f = 3200 + 1200 * np.sin(np.pi * t / 0.09) + R.random() * 600
            s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.09)
            i = int((x + k * 0.12) * SR)
            out[i:i + len(s)] += s
        x += 0.6 + R.random() * 0.8
    return norm(out, 0.25)


def tick(d):
    out = np.zeros(int(SR * d))
    t = _t(0.03)
    c = bpf(noise(0.03), 2000, 6000) * np.exp(-t * 150)
    x = 0.0
    k = 0
    while x < d - 0.05:
        i = int(x * SR)
        out[i:i + len(c)] += c * (1 if k % 2 else 0.7)
        x += 0.5
        k += 1
    return norm(out, 0.3)


def typing(d):
    out = np.zeros(int(SR * d))
    t = _t(0.02)
    c = bpf(noise(0.02), 1500, 5000) * np.exp(-t * 200)
    x = 0.0
    while x < d - 0.05:
        i = int(x * SR)
        out[i:i + len(c)] += c
        x += 0.09 + R.random() * 0.08
    return norm(out, 0.2)


def click():
    t = _t(0.05)
    return norm(bpf(noise(0.05), 1000, 6000) * np.exp(-t * 120), 0.5)


def stinger():
    d = 3.0
    t = _t(d)
    b = boom(d, 42)
    scr = np.zeros(len(t))
    for f in (1830, 1940, 2210):
        scr += np.sin(2 * np.pi * f * t * (1 + 0.004 * np.sin(2 * np.pi * 7 * t)))
    scr *= np.exp(-t * 1.6) * 0.18
    rev = bpf(noise(d), 200, 4000) * np.exp(-t * 2.5) * 0.3
    return norm(b + scr + rev, 0.98)


def riser(d):
    t = _t(d)
    s = bpf(noise(d), 400, 5000) * (t / d) ** 2.5
    f = 200 + 600 * (t / d) ** 2
    s += 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 2
    return norm(s, 0.5)
