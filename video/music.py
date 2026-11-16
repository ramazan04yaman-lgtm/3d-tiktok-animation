"""Dezente, düstere Hintergrundmusik per Code (Piano-Arpeggio in Moll + Pad + Bass)."""
import numpy as np

SR = 44100


def note(freq, dur, vel=0.3):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 2.4) * (1 - np.exp(-t * 400))
    sig = sum((0.55 ** h) * np.sin(2 * np.pi * freq * (h + 1) * t * (1 + 0.0007 * h)) for h in range(5))
    return vel * env * sig


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def pad(freqs, dur):
    t = np.arange(int(SR * dur)) / SR
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.6, 0.6):
            s += np.sin(2 * np.pi * (f + det) * t) + 0.3 * np.sin(2 * np.pi * 2 * (f + det) * t)
    env = np.minimum(1, np.minimum(t / 1.2, (dur - t) / 1.2))
    return s * env / (len(freqs) * 2)


def make_music(total, stop_t, end_t):
    """Musik bis stop_t (kurz vor dem Twist), danach Stille, ab end_t leises Pad für die Endkarte."""
    n = int(SR * total)
    mix = np.zeros(n + SR * 5)
    bpm = 80
    beat = 60 / bpm
    chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]  # Am F Dm E
    pattern = [0, 1, 2, 1, 0, 2, 1, 2]
    bar = beat * 4
    t, step = 0.0, 0
    while t < stop_t - 0.2:
        ch = chords[(step // 8) % 4]
        s = int(t * SR)
        nt = note(midi(ch[pattern[step % 8]] + 12), 1.6, 0.14 if step % 8 else 0.2)
        mix[s:s + len(nt)] += nt
        if step % 8 == 0:
            p = pad([midi(m) for m in ch], bar + 0.6) * 0.18
            mix[s:s + len(p)] += p
            b = note(midi(ch[0] - 24), 3.5, 0.32)
            mix[s:s + len(b)] += b
        t += beat / 2
        step += 1
    fade = int(0.4 * SR)
    st = int(stop_t * SR)
    mix[st - fade:st] *= np.linspace(1, 0, fade)
    mix[st:] = 0
    e = int(end_t * SR)
    p = pad([midi(45), midi(52), midi(57)], total - end_t + 0.1) * 0.35
    mix[e:e + len(p)] += p[:len(mix) - e]
    mix = mix[:n]
    return mix / (np.abs(mix).max() + 1e-9) * 0.8
