"""Düstere Storytime-Musik, komplett per Code synthetisiert (Piano-Arpeggio + Drone + Herzschlag + Riser + Impact)."""
import wave
import numpy as np

SR = 44100


def note(freq, dur, vel=0.3):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 2.6) * (1 - np.exp(-t * 400))
    sig = sum((0.6 ** h) * np.sin(2 * np.pi * freq * (h + 1) * t * (1 + 0.0007 * h)) for h in range(5))
    return vel * env * sig


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, "same")


def make_music(path, total, twist_t, tension_from):
    n = int(SR * total)
    mix = np.zeros(n + SR * 4)
    bpm = 76
    beat = 60 / bpm
    # Am - F - Dm - E  (dunkle Moll-Kadenz)
    chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]
    pattern = [0, 1, 2, 1, 0, 2, 1, 2]
    t = 0.0
    step = 0
    while t < twist_t - 0.1:
        ch = chords[(step // 8) % 4]
        m = ch[pattern[step % 8]] + 12
        s = int(t * SR)
        nt = note(midi(m), 1.6, 0.16 if step % 8 else 0.22)
        mix[s:s + len(nt)] += nt
        if step % 8 == 0:  # Basston
            b = note(midi(ch[0] - 24), 3.5, 0.35)
            mix[s:s + len(b)] += b
        t += beat / 2
        step += 1
    tt = np.arange(n) / SR
    # Drone
    drone = 0.07 * (np.sin(2 * np.pi * 55 * tt) + 0.5 * np.sin(2 * np.pi * 82.4 * tt)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.1 * tt))
    drone[tt >= twist_t] = 0
    mix[:n] += drone
    # Herzschlag ab Spannungsteil
    hb = np.exp(-np.arange(int(SR * 0.25)) / SR * 30) * np.sin(2 * np.pi * 50 * np.arange(int(SR * 0.25)) / SR)
    t = tension_from
    while t < twist_t - 0.3:
        for off, v in ((0, 0.5), (0.22, 0.35)):
            s = int((t + off) * SR)
            mix[s:s + len(hb)] += v * hb
        t += beat
    # Riser vor dem Twist
    rs = int((twist_t - 4.0) * SR)
    re_ = int(twist_t * SR)
    noise = lowpass(np.random.default_rng(2).normal(0, 1, re_ - rs), 6)
    mix[rs:re_] += 0.08 * noise * np.linspace(0, 1, re_ - rs) ** 2
    # Impact + hoher Ton beim Twist
    s = int(twist_t * SR)
    it = np.arange(int(SR * 3)) / SR
    boom = 0.9 * np.exp(-it * 2.2) * np.sin(2 * np.pi * (45 + 60 * np.exp(-it * 12)) * it)
    ring = 0.05 * np.exp(-it * 0.8) * np.sin(2 * np.pi * 2093 * it)
    mix[s:s + len(it)] += boom + ring
    mix = mix[:n]
    mix = mix / np.abs(mix).max() * 0.85
    st = np.stack([mix, np.roll(mix, 220)], 1)
    with wave.open(path, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
