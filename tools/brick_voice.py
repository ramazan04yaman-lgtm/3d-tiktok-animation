"""Eigene Sprachaufnahme in ein Bau-Video einbauen.
Usage: python3 tools/brick_voice.py videos/02-drache [--pause Aber=1.5 --pause Was=2.5]
Erwartet <video>/voice/stimme.(mp3|wav|m4a) und voice/words.json (Whisper-Wortzeiten).
Teilt die Aufnahme anhand der Satzanfänge aus script.json in Segmente, fügt optionale Pausen
vor Segmenten ein und erzeugt timeline.json + mix.wav.
"""
import glob, json, os, re, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio import SR, read_wav
from brick_audio import make_mix

TAIL = 1.4
norm = lambda w: re.sub(r"[^\wäöüß]", "", w.lower())


def main(vdir, pauses):
    b = os.path.join(vdir, "build"); os.makedirs(b, exist_ok=True)
    spec = json.load(open(os.path.join(vdir, "script.json"), encoding="utf-8"))
    parts = json.load(open(os.path.join(b, "parts.json")))
    src = sorted(glob.glob(os.path.join(vdir, "voice", "stimme.*")))[0]
    wav = os.path.join(b, "stimme_roh.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), wav], check=True)
    raw = read_wav(wav)
    words = json.load(open(os.path.join(vdir, "voice", "words.json"), encoding="utf-8"))
    fixed = []  # Whisper-Eigenheiten glätten: "1" ".188" -> "1.188", "erspeit" -> "er speit"
    for w in words:
        if fixed and re.match(r"^[.,]\d", w["w"]): fixed[-1]["w"] += w["w"]; fixed[-1]["e"] = w["e"]; continue
        fixed.append(dict(w))
    words = fixed
    for w in words:
        if w["w"].lower().startswith("erspeit"): w["w"] = "er speit" + w["w"][7:]
    # Segmentanfänge: erstes Wort jedes Skript-Segments der Reihe nach in der Aufnahme suchen
    starts, pos = [], 0
    for s in spec["segments"]:
        first = norm(s["text"].split()[0])
        while pos < len(words) and norm(words[pos]["w"]) != first: pos += 1
        if pos == len(words): sys.exit(f"Satzanfang nicht gefunden: {s['text'][:30]}")
        starts.append(pos); pos += 1
    # Pausen einfügen (Sekunden vor dem Segment, dessen erstes Wort passt)
    shift, cut_pts = np.zeros(len(words)), []
    for key, sec in pauses.items():
        i = next(k for k, s in enumerate(spec["segments"]) if norm(s["text"].split()[0]) == norm(key) and k > 0)
        w0 = words[starts[i]]; gap_t = (words[starts[i] - 1]["e"] + w0["s"]) / 2
        cut_pts.append((gap_t, sec)); shift[starts[i]:] += sec
    pieces, last = [], 0
    for t, sec in sorted(cut_pts):
        pieces += [raw[int(last * SR): int(t * SR)], np.zeros(int(sec * SR))]; last = t
    pieces.append(raw[int(last * SR):])
    voice = np.concatenate(pieces)
    for w, sh in zip(words, shift): w["s"] += sh; w["e"] += sh
    dur = round(min(len(voice) / SR, words[-1]["e"] + 0.3) + TAIL, 3)
    voice = np.pad(voice, (0, max(0, int(dur * SR) - len(voice))))[: int(dur * SR)]
    v = voice / (np.abs(voice).max() + 1e-6) * 0.9
    segs = []
    for k, s in enumerate(spec["segments"]):
        ws = words[starts[k]: starts[k + 1] if k + 1 < len(starts) else len(words)]
        ws = [{"w": w["w"], "s": round(w["s"], 3), "e": round(w["e"], 3)} for w in ws]
        for w in ws:  # Anzeige-Ersatz aus script.json ("show"), z. B. "1117" -> "1.117"
            core = norm(w["w"])
            for k2, v2 in s.get("show", {}).items():
                if norm(k2) == core: w["show"] = v2 + (w["w"][-1] if w["w"][-1] in ".,!?" else "")
        start = 0.0 if k == 0 else round(ws[0]["s"] - 0.12, 3)
        segs.append({**s, "start": start, "end": ws[-1]["e"], "words": ws})
    # Bau-Keyframes
    cum, n = {}, 0
    for p in parts["order"]: n += parts["counts"][p]; cum[p] = n
    nxt = lambda i: segs[i + 1]["start"] if i + 1 < len(segs) else dur
    kf = [[0.0, 0]]
    for i, s in enumerate(segs):
        if s.get("build") == "start": kf += [[0.35, 0], [nxt(i) - 0.05, 6]]
        elif s.get("build"): kf += [[s["start"] + 0.1, kf[-1][1]], [nxt(i) - 0.35, cum[s["build"]]]]
    kf.append([dur, parts["N"]])
    allw = [w for s in segs for w in s["words"]]
    if "events" in spec:  # generisch: Ereigniszeit = Start des ersten passenden Worts
        # Ereignis: [Szene, Wort] -> Start des Worts (exakter Vergleich) innerhalb dieser Szene
        ev = {k: next(w["s"] for s in segs if s["scene"] == sc for w in s["words"] if norm(w["w"]) == norm(wd))
              for k, (sc, wd) in spec["events"].items()}
        tl = {"title": spec["title"], "duration": dur, "keyframes": kf, **ev, "segments": segs}
    else:  # Drache
        glow_t = next(w["s"] for w in allw if norm(w["w"]).startswith("augen") and w["s"] > segs[6]["start"])
        fire_t = next(w["s"] for w in allw if "speit" in norm(w["w"]))
        outro = next(s for s in segs if s["scene"] == "outro")
        for s in segs:
            if s["scene"] == "fire" and s["start"] > fire_t: s["start"] = round(fire_t - 0.6, 3)
        tl = {"title": spec["title"], "duration": dur, "keyframes": kf, "glowT": glow_t, "fireT": fire_t,
              "fireEnd": outro["start"] + 1.2, "segments": segs}
    json.dump(tl, open(os.path.join(b, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    make_mix(b, tl, parts, v)
    print(f"Dauer {dur:.1f}s", {k: v for k, v in tl.items() if k.endswith("T")})
    for s in segs: print(f"  {s['scene']:6} {s['start']:6.2f}  {' '.join(w['w'] for w in s['words'])[:60]}")


if __name__ == "__main__":
    a = sys.argv[1:]
    pauses = {a[i + 1].split("=")[0]: float(a[i + 1].split("=")[1]) for i in range(len(a)) if a[i] == "--pause"}
    main(a[0], pauses)
