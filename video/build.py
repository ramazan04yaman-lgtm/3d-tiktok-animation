"""Baut das komplette TikTok-Video: TTS -> Timing -> Szenen -> Kamera/Schnitt -> Captions -> Musik -> MP4.

Aufruf:  python3 build.py   (Voice: Piper de_DE-thorsten-high in VOICE_DIR)
"""
import os
import re
import subprocess
import wave
import json

import numpy as np
from PIL import Image

import scenes
from music import make_music

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
VOICE = os.environ.get("VOICE", "/tmp/voices/de_DE-thorsten-high.onnx")
FPS = 30
SR = 22050

# (Szene, Satz) – Hook in Zeile 1, Twist am Ende
SCRIPT = [
    ("bed", "Was wäre, wenn du morgen aufwachst,"),
    ("street", "und jeder Mensch auf der Erde ist verschwunden?"),
    ("phone", "Dein Handy zeigt null Nachrichten. Kein Netz."),
    ("car", "Draußen stehen Autos mitten auf der Straße. Die Motoren laufen noch."),
    ("door", "Du rennst zu deinen Nachbarn. Die Tür ist offen."),
    ("coffee", "Der Kaffee auf dem Tisch ist noch warm."),
    ("blackout", "Nach drei Tagen fällt der Strom aus, weil niemand mehr die Kraftwerke steuert."),
    ("dogs", "Nach einer Woche kommen die Hunde. Hungrig. In Rudeln."),
    ("market", "Du plünderst Supermärkte,"),
    ("rot", "aber frisches Essen verfault in wenigen Tagen. Nur Konserven bleiben."),
    ("corner", "Nach einem Monat hörst du nachts zum ersten Mal Stimmen,"),
    ("eyes", "weil dein Gehirn ohne andere Menschen anfängt, sich Gesellschaft auszudenken."),
    ("green", "Nach einem Jahr ist die Stadt grün. Pflanzen brechen durch den Asphalt."),
    ("ring", "Und dann, an einem ganz normalen Morgen, vibriert dein Handy."),
    ("msg", "Eine Nachricht. Von deiner eigenen Nummer."),
    ("msg2", "Darin steht nur ein Satz:"),
    ("behind", "Dreh dich nicht um."),
]

# Fokuspunkt (0..1) für Punch-in-Schnitte
FOCUS = {
    "bed": (0.42, 0.56), "street": (0.55, 0.65), "phone": (0.52, 0.42), "car": (0.45, 0.68),
    "door": (0.55, 0.5), "coffee": (0.5, 0.62), "blackout": (0.5, 0.36), "dogs": (0.45, 0.7),
    "market": (0.52, 0.65), "rot": (0.35, 0.5), "corner": (0.5, 0.6), "eyes": (0.5, 0.47),
    "green": (0.5, 0.45), "ring": (0.5, 0.45), "msg": (0.5, 0.3), "msg2": (0.5, 0.36), "behind": (0.5, 0.35),
}
SHAKE = {"dogs", "eyes", "ring", "behind", "blackout"}


def tts(text, path):
    subprocess.run(["python3", "-m", "piper", "-m", VOICE, "--length-scale", "0.86",
                    "--sentence-silence", "0.12", "-f", path], input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(path) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    # Stille vorn/hinten abschneiden
    env = np.convolve(np.abs(a), np.ones(256) / 256, "same")
    idx = np.where(env > 0.01)[0]
    return a[max(0, idx[0] - 200): idx[-1] + 600]


def word_times(text, start, dur):
    words = text.split()
    wts = []
    for w in words:
        wt = len(re.sub(r"\W", "", w)) + 2.5
        if w[-1] in ",:":
            wt += 3
        if w[-1] in ".?!":
            wt += 5
        wts.append(wt)
    tot = sum(wts)
    t = start
    res = []
    for w, wt in zip(words, wts):
        d = dur * wt / tot
        res.append((w, t, t + d))
        t += d
    return res


def ass_time(t):
    h, t = divmod(t, 3600)
    m, s = divmod(t, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def captions(words, path):
    # 1–2 Wörter pro Einblendung (wie Referenz), kurze Wörter werden gebündelt
    groups = []
    i = 0
    while i < len(words):
        w, s, e = words[i]
        clean = re.sub(r"[^\wäöüÄÖÜß%-]", "", w)
        if len(clean) <= 4 and i + 1 < len(words) and w[-1] not in ",.?!:":
            w2, _, e2 = words[i + 1]
            groups.append((clean + " " + re.sub(r"[^\wäöüÄÖÜß%-]", "", w2), s, e2))
            i += 2
        else:
            groups.append((clean, s, e))
            i += 1
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: W,Liberation Serif,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,3,7,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for k, (txt, s, e) in enumerate(groups):
        e = groups[k + 1][1] if k + 1 < len(groups) else e + 0.6
        lines.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},W,,0,0,0,,"
                     f"{{\\pos(540,1060)\\blur1.5\\fscx118\\fscy118\\t(0,90,\\fscx100\\fscy100)}}{txt}")
    open(path, "w").write(head + "\n".join(lines) + "\n")


def cuts_for(scene, t0, t1):
    """Teilt einen Szenenblock in ~1.4s Schnitte mit wechselnder Kameraeinstellung."""
    d = t1 - t0
    n = max(1, round(d / 1.5))
    fx, fy = FOCUS[scene]
    plans = [(1.0, 1.07, 0.5, 0.5), (1.38, 1.46, fx, fy), (1.18, 1.12, fx * 0.6 + 0.2, fy * 0.6 + 0.2), (1.55, 1.62, fx, fy)]
    if scene == "bed":  # Hook: sofort nah aufs Gesicht, dann Totale
        plans = [(1.7, 1.6, 0.36, 0.55), (1.0, 1.07, 0.5, 0.5)]
    out = []
    for k in range(n):
        z0, z1, cx, cy = plans[k % len(plans)]
        out.append((t0 + d * k / n, t0 + d * (k + 1) / n, z0, z1, cx, cy))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    fr = os.path.join(OUT, "frames")
    os.makedirs(fr, exist_ok=True)

    # 1) Voice-over
    audio, blocks, words = [], [], []
    t = 0.25
    audio.append(np.zeros(int(SR * 0.25), np.float32))
    for i, (sc, text) in enumerate(SCRIPT):
        a = tts(text, os.path.join(fr, f"vo{i}.wav"))
        d = len(a) / SR
        words += word_times(text, t, d)
        gap = 0.08
        blocks.append((sc, t if i else 0.0, t + d + gap))
        audio += [a, np.zeros(int(SR * gap), np.float32)]
        t += d + gap
    tail = 2.2  # Nachhall nach "Dreh dich nicht um."
    audio.append(np.zeros(int(SR * tail), np.float32))
    total = t + tail
    blocks[-1] = (blocks[-1][0], blocks[-1][1], total)
    vo = np.concatenate(audio)
    vo = vo / np.abs(vo).max() * 0.9
    with wave.open(os.path.join(OUT, "voice.wav"), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((vo * 32767).astype(np.int16).tobytes())
    json.dump({"blocks": blocks, "words": words, "total": total}, open(os.path.join(OUT, "timing.json"), "w"), indent=1)
    print(f"Voice: {total:.1f}s")

    # 2) Musik (komplett synthetisiert)
    twist = blocks[-1][1]
    make_music(os.path.join(OUT, "music.wav"), total, twist, tension_from=blocks[10][1])

    # 3) Szenen rendern
    for k, f in scenes.SCENES.items():
        open(os.path.join(fr, f"{k}.svg"), "w").write(f())
    subprocess.run(["node", os.path.join(HERE, "render_svgs.js"), fr], check=True)

    # 4) Captions
    captions(words, os.path.join(OUT, "captions.ass"))

    # 5) Kamera + Schnitt -> Video
    cuts = []
    for sc, a, b in blocks:
        for c in cuts_for(sc, a, b):
            cuts.append((sc,) + c)
    imgs = {k: Image.open(os.path.join(fr, f"{k}.png")).convert("RGB") for k in scenes.SCENES}
    nframes = int(total * FPS)
    silent = os.path.join(OUT, "silent.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "14",
                           "-pix_fmt", "yuv420p", silent], stdin=subprocess.PIPE)
    ci = 0
    for f in range(nframes):
        tt = f / FPS
        while ci + 1 < len(cuts) and tt >= cuts[ci + 1][1]:
            ci += 1
        sc, a, b, z0, z1, cx, cy = cuts[ci]
        u = min(1.0, max(0.0, (tt - a) / max(0.01, b - a)))
        u = u * u * (3 - 2 * u)
        z = z0 + (z1 - z0) * u
        im = imgs[sc]
        IW, IH = im.size
        cw, ch = IW / z, IH / z
        x0 = min(max(0, cx * IW - cw / 2), IW - cw)
        y0 = min(max(0, cy * IH - ch / 2), IH - ch)
        if sc in SHAKE:
            amp = 10 if sc != "behind" else (4 + 26 * max(0, 1 - (tt - a) / 0.5))
            x0 = min(max(0, x0 + amp * np.sin(tt * 37)), IW - cw)
            y0 = min(max(0, y0 + amp * np.cos(tt * 29)), IH - ch)
        # Schnitt-Punch: erster Frame leicht reingezoomt
        if tt - a < 2 / FPS and ci > 0:
            x0 += cw * 0.02; y0 += ch * 0.02; cw *= 0.96; ch *= 0.96
        fr_im = im.resize((1080, 1920), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))
        arr = np.asarray(fr_im).astype(np.float32)
        if total - tt < 0.35:  # harter Schnitt ins Schwarze am Ende
            arr = arr * max(0, (total - tt) / 0.35)
        ff.stdin.write(np.clip(arr, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()

    # 6) Mischen + Captions einbrennen
    ass = os.path.join(OUT, "captions.ass")
    for name, mus_vol in (("video_final.mp4", 0.32), ("video_ohne_musik.mp4", 0.0)):
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", silent, "-i", os.path.join(OUT, "voice.wav"), "-i", os.path.join(OUT, "music.wav"),
            "-filter_complex",
            f"[0:v]ass={ass}[v];[1:a]aresample=44100,highpass=f=70,acompressor=threshold=-20dB:ratio=3,volume=1.6[vo];"
            f"[2:a]volume={mus_vol}[m];[vo][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[a]",
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", os.path.join(OUT, name)], check=True)
    print("fertig:", os.path.join(OUT, "video_final.mp4"))


if __name__ == "__main__":
    main()
