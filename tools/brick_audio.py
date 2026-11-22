"""Audio + Timeline für Bau-Videos (Klemmbausteine).
Usage: python3 tools/brick_audio.py videos/02-drache [--target 60]
Braucht build/parts.json (node tools/render.js <video> --page src/brick/index.html --counts).
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio import SR, tts, word_times, write_wav, music, env

GAP, LEAD_IN, TAIL = 0.25, 0.15, 1.2


def click(rng):
    L = int(0.03 * SR); t = np.arange(L) / SR
    f = rng.uniform(1800, 3200)
    c = (np.sin(2 * np.pi * f * t) * 0.6 + rng.normal(0, 1, L) * 0.5) * np.exp(-t / 0.004)
    c2 = np.sin(2 * np.pi * f * 0.45 * t) * np.exp(-t / 0.012) * 0.5  # "Knack" + Körper
    return c + c2


def make_mix(b, tl, parts, v=None, name="mix.wav"):
    """Musik + Klicks + Feuer aus der Timeline; optional mit Stimme v (mono, SR)."""
    dur, segs, fire_t, fire_end = tl["duration"], tl["segments"], tl["fireT"], tl["fireEnd"]
    n = int(dur * SR); v = np.zeros(n) if v is None else np.pad(v, (0, max(0, n - len(v))))[:n]
    rng = np.random.default_rng(3); clicks = np.zeros(n); K = np.array(tl["keyframes"], float)
    for k in range(1, parts["N"] + 1):
        j = np.searchsorted(K[:, 1], k)
        t0, n0 = K[j - 1]; t1, n1 = K[j]
        t = t1 if n1 == n0 else t0 + (t1 - t0) * (k - n0) / (n1 - n0)
        rate = (n1 - n0) / max(t1 - t0, 1e-3)
        c = click(rng) * rng.uniform(.5, 1) * (0.32 if rate < 20 else 0.32 * (20 / rate) ** .5)
        s0 = int(t * SR); e = min(n, s0 + len(c)); clicks[s0:e] += c[: e - s0]
    L = int((fire_end - fire_t + 0.8) * SR); s0 = int(fire_t * SR)
    nz = np.convolve(rng.normal(0, 1, L), np.ones(40) / 40, "same") * 3
    tt = np.arange(L) / SR; envf = np.minimum(1, tt / 0.15) * np.minimum(1, (tt[-1] - tt) / 0.8)
    fire = nz * envf * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * tt)) * 0.5
    m = music(dur, [s["start"] for s in segs[1:]], fire_t, pulse_start=0.6, riser_len=2.5)[:n]
    venv = np.convolve(np.abs(v), np.ones(4410) / 4410, "same")
    duck = 1 - 0.45 * np.clip(venv / 0.05, 0, 1)
    mix = m * duck[:, None] * 0.85 + v[:, None] + clicks[:, None]
    e = min(n, s0 + L); mix[s0:e] += fire[: e - s0, None]
    mix /= max(1, np.abs(mix).max() / 0.98)
    write_wav(os.path.join(b, name), mix)


def main(vdir, target):
    spec = json.load(open(os.path.join(vdir, "script.json"), encoding="utf-8"))
    b = os.path.join(vdir, "build"); parts = json.load(open(os.path.join(b, "parts.json")))
    audio = [tts(s["text"], os.path.join(b, f"seg{i}.wav")) for i, s in enumerate(spec["segments"])]
    base = LEAD_IN + sum(len(a) / SR + GAP for a in audio) + TAIL
    stretch = [i for i, s in enumerate(spec["segments"]) if s.get("stretch")]
    weights = np.array([parts["counts"][spec["segments"][i]["build"]] for i in stretch], float) ** 0.5
    extra = max(0.0, target - base); add = dict(zip(stretch, extra * weights / weights.sum()))
    segs, pieces, cur = [], [np.zeros(int(LEAD_IN * SR))], LEAD_IN
    for i, (s, a) in enumerate(zip(spec["segments"], audio)):
        d = len(a) / SR
        ws = word_times(s["text"], cur, cur + d)
        for w in ws:  # Anzeige-Ersatz, z. B. Zahl als Ziffern statt als Wort
            core = w["w"].rstrip(".,!?")
            if core in s.get("show", {}): w["show"] = s["show"][core] + w["w"][len(core):]
        segs.append({**s, "start": round(cur, 3), "end": round(cur + d, 3), "words": ws})
        hold = GAP + add.get(i, 0)
        pieces += [a, np.zeros(int(hold * SR))]; cur += d + hold
    voice = np.concatenate(pieces + [np.zeros(int(TAIL * SR))]); dur = len(voice) / SR
    # Bau-Keyframes [t, Anzahl gesetzter Steine]
    cum, n, kf = {}, 0, [[0.0, 0]]
    for p in parts["order"]:
        n += parts["counts"][p]; cum[p] = n
    nxt = lambda i: segs[i + 1]["start"] if i + 1 < len(segs) else dur
    for i, s in enumerate(segs):
        if s.get("build") == "start":
            kf += [[0.35, 0], [nxt(i) - 0.05, 6]]
        elif s.get("build"):
            kf += [[s["start"] + 0.1, kf[-1][1]], [nxt(i) - 0.35, cum[s["build"]]]]
    kf.append([dur, parts["N"]])
    seg_of = lambda sc: next(s for s in segs if s["scene"] == sc)
    glow_t = next(w["s"] for w in seg_of("glow")["words"] if w["w"].startswith("Augen"))
    fire_s = seg_of("fire"); fire_t = next(w["s"] for w in fire_s["words"] if w["w"].startswith("speit"))
    fire_end = seg_of("outro")["start"] + 1.2
    tl = {"title": spec["title"], "duration": round(dur, 3), "keyframes": kf, "glowT": glow_t, "fireT": fire_t,
          "fireEnd": fire_end, "segments": segs}
    json.dump(tl, open(os.path.join(b, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    v = voice / (np.abs(voice).max() + 1e-6) * 0.9
    write_wav(os.path.join(b, "voice.wav"), v)
    make_mix(b, tl, parts, v)
    print(f"Dauer {dur:.1f}s (Sprache {base:.1f}s), Glow {glow_t:.2f}s, Feuer {fire_t:.2f}s")
    for s in segs: print(f"  {s['scene']:6} {s['start']:6.2f}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--novoice" in a:  # nur Musik + SFX zur bestehenden Timeline
        b = os.path.join(a[0], "build")
        make_mix(b, json.load(open(os.path.join(b, "timeline.json"))), json.load(open(os.path.join(b, "parts.json"))), None, "mix_ohne-stimme.wav")
    else:
        main(a[0], float(a[a.index("--target") + 1]) if "--target" in a else 60.0)
