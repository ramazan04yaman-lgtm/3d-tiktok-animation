"""Voice-over (Piper TTS, lokal) + Timeline + Originalmusik + SFX.

Usage: python3 tools/audio.py videos/01-mond
Erzeugt in <video>/build/: voice.wav, music.wav, mix.wav, timeline.json
"""
import json, os, re, subprocess, sys, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.environ.get("PIPER_VOICE", os.path.join(ROOT, "voices", "de_thorsten.onnx"))
GAP = 0.22          # Pause zwischen Segmenten
LEAD_IN = 0.15      # Stimme startet sofort (Hook!)
LENGTH_SCALE = "0.84"  # schneller als normal – TikTok-Tempo


def read_wav(p):
    with wave.open(p) as w:
        sr, n = w.getframerate(), w.getnframes()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            a = a.reshape(-1, 2).mean(1)
    if sr != SR:
        x = np.linspace(0, len(a) - 1, int(len(a) * SR / sr))
        a = np.interp(x, np.arange(len(a)), a)
    return a


def write_wav(p, a):
    a = np.clip(a, -1, 1)
    if a.ndim == 1:
        a = np.stack([a, a], 1)
    with wave.open(p, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((a * 32767).astype(np.int16).tobytes())


def trim(a, thr=0.008):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(0, idx[0] - 200): idx[-1] + 2000] if len(idx) else a


def tts(text, out):
    subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "--length-scale", LENGTH_SCALE,
                    "--sentence-silence", "0.12", "-f", out], input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return trim(read_wav(out))


def word_times(text, t0, t1):
    """Wortzeiten proportional zur Silbenlänge verteilen (+ Pausen an Satzzeichen)."""
    words = text.split()
    w = []
    for wd in words:
        core = re.sub(r"[^\wäöüÄÖÜß]", "", wd)
        weight = 0.6 + len(core) * 0.11 + (0.5 if re.search(r"[.!?]$", wd) else 0.25 if wd.endswith(",") else 0)
        w.append(weight)
    w = np.array(w); cum = np.concatenate([[0], np.cumsum(w)]) / w.sum()
    return [{"w": wd, "s": round(t0 + (t1 - t0) * cum[i], 3), "e": round(t0 + (t1 - t0) * cum[i + 1], 3)}
            for i, wd in enumerate(words)]


# ---------------- Musik (eigene Komposition, prozedural) ----------------
def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def music(dur, cuts, impact_t):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2), np.float32)
    bpm = 100; beat = 60 / bpm
    # Akkordfolge (dunkles Moll): Am – F – C – G-artig, als Drone-Pad
    roots = [55.0, 43.65, 65.41, 49.0]
    bar = beat * 4
    pad = np.zeros(n, np.float32)
    for i, r in enumerate(roots * 20):
        s = int(i * bar * 2 * SR); e = min(n, int((i + 1) * bar * 2 * SR))
        if s >= n: break
        tt = t[s:e] - t[s]
        fade = np.minimum(1, np.minimum(tt / 0.6, (tt[-1] - tt + 1e-3) / 0.6))
        v = sum(np.sin(2 * np.pi * f * tt + k) * g for k, (f, g) in enumerate(
            [(r, .5), (r * 2, .25), (r * 3 * 1.0, .12), (r * 2.4, .14), (r * 4.01, .05)]))
        pad[s:e] += v * fade
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t)
    pad *= 0.16 * lfo
    out[:, 0] += pad; out[:, 1] += np.roll(pad, 300)
    # Puls: Kick (Herzschlag) + Hi-Hat-Ticken (Uhr), startet nach dem Impact
    kick_len = int(0.35 * SR); kt = np.arange(kick_len) / SR
    kick = np.sin(2 * np.pi * (45 + 90 * np.exp(-kt * 30)) * kt) * env(kick_len, 0.002, 0.18)
    rng = np.random.default_rng(1)
    hat_len = int(0.05 * SR); hat = rng.normal(0, 1, hat_len) * env(hat_len, 0.001, 0.012)
    hat = np.diff(np.concatenate([[0], hat]))  # Hochpass-artig
    k = impact_t
    while k < dur - 0.3:
        for off, g in ((0, 0.55), (beat * 0.42, 0.35)):  # "ba-dum"
            s = int((k + off) * SR); e = min(n, s + kick_len)
            out[s:e] += (kick[: e - s] * g)[:, None]
        k += beat * 2
    h = impact_t
    while h < dur - 0.1:
        s = int(h * SR); e = min(n, s + hat_len)
        out[s:e] += (hat[: e - s] * 0.05)[:, None]
        h += beat / 2
    # Arp-Glocke (spannend, hoch)
    notes = [440, 523.25, 659.25, 523.25, 392, 523.25, 587.33, 493.88]
    j = 0; a = impact_t + bar
    bl = int(0.6 * SR); bt = np.arange(bl) / SR
    while a < dur - 0.6:
        f = notes[j % len(notes)]
        bell = (np.sin(2 * np.pi * f * bt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * bt)) * env(bl, 0.002, 0.25)
        s = int(a * SR); e = min(n, s + bl)
        out[s:e, j % 2] += bell[: e - s] * 0.05
        j += 1; a += beat / 2
    # SFX: Whoosh vor jedem Schnitt, großer Impact beim Verschwinden
    for c in cuts:
        L = int(0.5 * SR); s = int((c - 0.4) * SR)
        if s < 0: continue
        nz = rng.normal(0, 1, L); tt = np.arange(L) / L
        cut = np.convolve(nz, np.ones(25) / 25, "same") * np.sin(np.pi * tt) ** 2 * tt
        e = min(n, s + L); out[s:e] += (cut[: e - s] * 0.22)[:, None]
    L = int(2.5 * SR); s = int(impact_t * SR); tt = np.arange(L) / SR
    boom = np.sin(2 * np.pi * (30 + 60 * np.exp(-tt * 8)) * tt) * np.exp(-tt * 1.6)
    boom += rng.normal(0, 1, L) * np.exp(-tt * 9) * 0.4
    e = min(n, s + L); out[s:e] += (boom[: e - s] * 0.6)[:, None]
    # Riser vor dem Impact
    L = int(impact_t * SR)
    if L > 0:
        tt = np.arange(L) / SR
        riser = np.sin(2 * np.pi * (200 + 900 * (tt / tt[-1]) ** 2) * tt) * (tt / tt[-1]) ** 2 * 0.06
        out[:L] += riser[:, None]
    # Fade out
    fo = int(1.2 * SR); out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return out


def main(vdir):
    spec = json.load(open(os.path.join(vdir, "script.json"), encoding="utf-8"))
    b = os.path.join(vdir, "build"); os.makedirs(b, exist_ok=True)
    pieces, segs, cur = [np.zeros(int(LEAD_IN * SR))], [], LEAD_IN
    for i, s in enumerate(spec["segments"]):
        a = tts(s["text"], os.path.join(b, f"seg{i}.wav"))
        d = len(a) / SR
        segs.append({**s, "start": round(cur, 3), "end": round(cur + d, 3),
                     "words": word_times(s["text"], cur, cur + d)})
        pieces += [a, np.zeros(int(GAP * SR))]; cur += d + GAP
    voice = np.concatenate(pieces)
    tail = 1.4
    voice = np.concatenate([voice, np.zeros(int(tail * SR))])
    dur = len(voice) / SR
    # Impact = Moment, in dem der Mond verschwindet (Wort "verschwindet" im Hook)
    impact = next(w["s"] for w in segs[0]["words"] if w["w"].startswith("verschwindet"))
    cuts = [s["start"] for s in segs[1:]]
    m = music(dur, cuts, impact)
    # Ducking: Musik leiser, solange gesprochen wird
    venv = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
    duck = 1 - 0.45 * np.clip(venv / 0.05, 0, 1)
    v = voice / (np.abs(voice).max() + 1e-6) * 0.92
    mix = m * duck[:, None] * 0.9 + v[:, None]
    mix /= max(1, np.abs(mix).max() / 0.98)
    write_wav(os.path.join(b, "voice.wav"), v)
    write_wav(os.path.join(b, "music.wav"), m)
    write_wav(os.path.join(b, "mix.wav"), mix)
    json.dump({"title": spec["title"], "duration": round(dur, 3), "impact": impact, "segments": segs},
              open(os.path.join(b, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Dauer {dur:.1f}s, impact {impact:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1])
