"""Baut das TikTok-Video: Skript -> TTS -> Wort-Timing (Whisper) -> Untertitel/Cues -> SFX + Musik -> Animation -> MP4.

    python3 build.py            # komplettes Video
    python3 build.py --audio    # nur Audio + timing.json (schnell, für Vorschau-Stills)

Skript-Markup:  *wort* = gelb hervorgehoben,  !wort! = rot,  {cue} = Sound/Animations-Cue am nächsten Wort
"""
import difflib
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

import sfx
from music import make_music

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
VOICE = os.environ.get("VOICE", "/tmp/voices/de_DE-thorsten-high.onnx")
SR = 44100

# (Szene, Chip oben, Text) – Handlung wie Video #1, ausführlicher erzählt
SCRIPT = [
    ("bed", "TAG 1 · 07:12", "Was wäre, wenn du morgen aufwachst, und jeder Mensch auf der Erde ist *verschwunden*?"),
    ("phone", "TAG 1 · 07:13", "Dein Handy zeigt *null* Nachrichten. {err}Kein Netz. Kein einziger Anruf."),
    ("street", "TAG 1 · 07:20", "Draußen stehen Autos mitten auf der Straße. Die Türen sind offen. Die Motoren *laufen* *noch*."),
    ("door", "TAG 1 · 07:31", "Du rennst rüber zu deinen Nachbarn und {knock}klopfst. Keine Antwort. Die Tür ist nur {creak}angelehnt."),
    ("coffee", "TAG 1 · 07:32", "Auf dem Küchentisch steht ein Kaffee. Er ist *noch* *warm*."),
    ("blackout", "TAG 3", "*Tag* *drei.* Der Strom {powerdown}fällt aus, weil niemand mehr die Kraftwerke steuert. Die ganze Stadt wird *dunkel*."),
    ("dogs", "TAG 7", "*Tag* *sieben.* Dann kommen die {growl}!Hunde.! Ausgehungert, und in großen Gruppen."),
    ("market", "TAG 12", "Du plünderst die Supermärkte."),
    ("rot", "TAG 12", "Aber Obst, Fleisch und Brot *verfaulen* in wenigen Tagen. {cans}Nur die *Konserven* bleiben."),
    ("corner", "TAG 30 · 03:12", "*Tag* *dreißig.* Nachts hörst du zum ersten Mal {whisper}!Stimmen.!"),
    ("eyes", "TAG 30 · 03:13", "Denn dein Gehirn hält die Einsamkeit nicht aus, und fängt an, sich *Gesellschaft* auszudenken."),
    ("green", "TAG 365", "Nach einem Jahr ist die Stadt *grün.* Bäume brechen durch den Asphalt. Die Natur holt sich alles zurück."),
    ("ring", "TAG 366 · 07:12", "Und dann, an einem ganz normalen Morgen, {vibrate}*vibriert* dein Handy."),
    ("msg", "TAG 366 · 07:12", "{ping}Eine neue Nachricht. Von deiner *eigenen* *Nummer.*"),
    ("msg2", "TAG 366 · 07:12", "{typing}Darin steht nur ein Satz:"),
    ("behind", "", "{stinger}!Dreh! !dich! !nicht! !um.!"),
    ("end", "", "Würdest du dich umdrehen? Schreib es in die Kommentare."),
]
HOLD = {"behind": 1.9, "end": 1.4, "msg2": 0.35}


def parse(text):
    words, cues, pending = [], {}, []
    color = None
    for tok in text.split():
        m = re.match(r"^\{(\w+)\}(.*)$", tok)
        while m:
            pending.append(m.group(1))
            tok = m.group(2)
            m = re.match(r"^\{(\w+)\}(.*)$", tok)
        c = None
        if tok.startswith("*") or tok.startswith("!"):
            c = "y" if tok[0] == "*" else "r"
            tok = tok.strip("*!")
        w = tok.replace("*", "").replace("!", "") if c else tok
        for p in pending:
            cues[p] = len(words)
        pending = []
        words.append({"w": w, "c": c})
    clean = " ".join(x["w"] for x in words)
    return words, cues, clean


def tts(text, path):
    subprocess.run(["python3", "-m", "piper", "-m", VOICE, "--length-scale", "0.9", "--sentence-silence", "0.18", "-f", path],
                   input=text.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    proc = path.replace(".wav", "_p.wav")
    # klare Stimme: Hochpass, Präsenz, Kompressor, 44.1 kHz
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-af",
                    "highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=200:t=q:w=1:g=1.5,acompressor=threshold=-22dB:ratio=3:attack=5:release=80,aresample=44100",
                    "-ac", "1", proc], check=True)
    with wave.open(proc) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    env = np.convolve(np.abs(a), np.ones(512) / 512, "same")
    idx = np.where(env > 0.012)[0]
    return a[max(0, idx[0] - 400): idx[-1] + 1200]


_model = None


def align(audio, words):
    """Wort-Startzeiten per Whisper; Zuordnung zum bekannten Text via difflib, Lücken interpoliert."""
    global _model
    from faster_whisper import WhisperModel
    if _model is None:
        _model = WhisperModel("base", compute_type="int8")
    a16 = audio[::1][:]  # 44.1k -> 16k
    idx = np.arange(0, len(a16), SR / 16000).astype(int)
    segs, _ = _model.transcribe(a16[idx].astype(np.float32), language="de", word_timestamps=True, initial_prompt=" ".join(w["w"] for w in words))
    ww = [(x.word.strip(), x.start, x.end) for s in segs for x in s.words]
    norm = lambda s: re.sub(r"[^a-zäöüß0-9]", "", s.lower())
    A = [norm(w["w"]) for w in words]
    B = [norm(w[0]) for w in ww]
    st = [None] * len(words)
    en = [None] * len(words)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag in ("equal", "replace") and (i2 - i1) == (j2 - j1):
            for k in range(i2 - i1):
                st[i1 + k], en[i1 + k] = ww[j1 + k][1], ww[j1 + k][2]
    dur = len(audio) / SR
    # Interpolation fehlender Zeiten nach Zeichenlänge
    known = [i for i in range(len(words)) if st[i] is not None]
    if not known:
        st[0], known = 0.0, [0]
    if st[0] is None:
        st[0] = 0.0
        known = [0] + known
    known.append(len(words))
    tend = dur
    for a, b in zip(known[:-1], known[1:]):
        ta = st[a]
        tb = st[b] if b < len(words) else tend
        lens = [len(words[i]["w"]) + 2 for i in range(a, b)]
        acc = 0
        for i in range(a, b):
            if st[i] is None or i == a:
                st[i] = st[i] if st[i] is not None else ta + (tb - ta) * acc / sum(lens)
            acc += lens[i - a]
    st = [min(max(0.0, s), dur) for s in st]
    for i in range(1, len(st)):
        st[i] = max(st[i], st[i - 1] + 0.05)
    return st


def phrases_for(words, starts, t0, dur):
    """Untertitel-Phrasen: vollständige Sinneinheiten, max. 4 Wörter / 24 Zeichen, Bruch an Satzzeichen."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        txt = " ".join(words[k]["w"] for k in cur)
        nxt = words[i + 1]["w"] if i + 1 < len(words) else ""
        end_punct = w["w"][-1] in ".,?!:"
        too_long = len(txt) + 1 + len(nxt) > 24 or len(cur) >= 4
        if end_punct or too_long or i == len(words) - 1:
            # kurze Wörter nicht allein am Ende lassen
            out.append(cur)
            cur = []
    res = []
    for k, grp in enumerate(out):
        a = t0 + starts[grp[0]] - 0.04
        b = t0 + (starts[out[k + 1][0]] - 0.04 if k + 1 < len(out) else dur + 0.25)
        res.append({"t0": round(a, 3), "t1": round(b, 3), "words": [words[i] for i in grp]})
    return res


def write_wav(path, x, ch=1):
    x = np.clip(x, -1, 1)
    with wave.open(path, "w") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, "tmp")
    os.makedirs(tmp, exist_ok=True)
    blocks, phrases, events = [], [], []
    voice_parts = []
    t = 0.0
    lead = 0.12
    for i, (scene, chip, text) in enumerate(SCRIPT):
        words, cues, clean = parse(text)
        a = tts(clean, os.path.join(tmp, f"vo{i}.wav"))
        starts = align(a, words)
        vstart = t + (lead if i == 0 else 0.0)
        voice_parts.append((vstart, a))
        d = len(a) / SR
        b0 = t
        b1 = vstart + d + HOLD.get(scene, 0.06)
        phrases += phrases_for(words, starts, vstart, d)
        bcues = {name: round(vstart - b0 + starts[wi], 3) for name, wi in cues.items()}
        blocks.append({"scene": scene, "chip": chip, "t0": round(b0, 3), "t1": round(b1, 3), "cues": bcues})
        print(f"{scene:9s} {b0:6.2f}-{b1:6.2f}  {clean}")
        t = b1
    total = t
    # Untertitel der Endkarte ausblenden (Text steht groß im Bild) und Lücken schließen
    end0 = blocks[-1]["t0"]
    phrases = [p for p in phrases if p["t0"] < end0 - 0.01]
    for p in phrases:
        p["t1"] = min(p["t1"], end0)
    json.dump({"total": round(total, 3), "blocks": blocks, "phrases": phrases}, open(os.path.join(OUT, "timing.json"), "w"), ensure_ascii=False, indent=1)
    print(f"Gesamtlänge: {total:.1f}s")

    # ---------------- Audio
    n = int(SR * (total + 0.5))
    voice = np.zeros(n)
    for st, a in voice_parts:
        i = int(st * SR)
        voice[i:i + len(a)] += a[:n - i]
    voice = voice / np.abs(voice).max() * 0.9
    fx = np.zeros(n)

    def add(tt, x, g=1.0):
        i = int(tt * SR)
        if i >= n:
            return
        fx[i:i + len(x)] += g * x[:n - i]

    B = {b["scene"]: b for b in blocks}
    cue = lambda s, c: B[s]["t0"] + B[s]["cues"][c]
    for b in blocks[1:]:
        if b["scene"] not in ("behind", "end", "msg2"):
            add(b["t0"] - 0.2, sfx.whoosh(), 0.22)
    add(0.0, sfx.boom(1.8, 55), 0.35)
    add(0.05, sfx.vibrate(0.9), 0.25)
    add(cue("phone", "err"), sfx.error_beep(), 0.4)
    s = B["street"]; add(s["t0"], sfx.engine(s["t1"] - s["t0"] + 0.2), 0.35); add(s["t0"], sfx.wind(s["t1"] - s["t0"]), 0.25)
    s = B["door"]
    for k in range(7):
        add(s["t0"] + 0.05 + k * 0.16, sfx.step(), 0.45)
    for k in range(3):
        add(cue("door", "knock") + k * 0.3, sfx.knock(), 0.7)
    add(cue("door", "creak"), sfx.creak(1.4), 0.45)
    s = B["coffee"]; add(s["t0"], sfx.tick(s["t1"] - s["t0"]), 0.35)
    add(cue("blackout", "powerdown"), sfx.powerdown(), 0.6)
    add(cue("blackout", "powerdown"), sfx.spark(), 0.5)
    s = B["dogs"]; add(s["t0"], sfx.wind(s["t1"] - s["t0"]), 0.3)
    add(cue("dogs", "growl"), sfx.growl(), 0.55)
    add(cue("dogs", "growl") + 1.2, sfx.bark(), 0.45)
    add(cue("dogs", "growl") + 1.55, sfx.bark(), 0.35)
    s = B["market"]; add(s["t0"] + 0.1, sfx.click(), 0.4)
    for k in range(int((s["t1"] - s["t0"]) / 0.4)):
        add(s["t0"] + 0.2 + k * 0.4, sfx.step(), 0.3)
    s = B["rot"]; add(s["t0"], sfx.flies(s["t1"] - s["t0"]), 0.35)
    for k in range(5):
        add(cue("corner", "whisper") + k * 0.45, sfx.whisper(1.3), 0.45)
    s0 = B["corner"]["t0"]; s1 = B["eyes"]["t1"]
    add(s0 + 0.3, sfx.heartbeat(70, B["corner"]["t1"] - s0), 0.4)
    add(B["eyes"]["t0"], sfx.heartbeat(92, B["eyes"]["t1"] - B["eyes"]["t0"]), 0.5)
    add(B["eyes"]["t0"], sfx.tinnitus(B["eyes"]["t1"] - B["eyes"]["t0"]), 0.5)
    s = B["green"]; add(s["t0"], sfx.birds(s["t1"] - s["t0"]), 0.35); add(s["t0"], sfx.wind(s["t1"] - s["t0"]), 0.15)
    v = cue("ring", "vibrate")
    add(v, sfx.vibrate(B["ring"]["t1"] - v), 0.5)
    add(cue("msg", "ping"), sfx.ping(), 0.55)
    add(B["msg2"]["t0"], sfx.typing(B["msg2"]["t1"] - B["msg2"]["t0"] - 0.35), 0.4)
    st = cue("behind", "stinger")
    add(st - 2.2, sfx.riser(2.2), 0.35)
    add(st, sfx.stinger(), 0.9)
    add(B["end"]["t0"], sfx.boom(2.0, 40), 0.3)

    music = make_music(total + 0.5, stop_t=B["behind"]["t0"] - 0.1, end_t=B["end"]["t0"])
    music = np.pad(music, (0, max(0, n - len(music))))[:n]
    # Ducking: Musik geht runter, sobald gesprochen wird
    env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
    env = np.clip(env / (env.max() * 0.35), 0, 1)
    duck = 1 - 0.55 * env
    mix = voice + 0.17 * music * duck + 0.55 * fx * (1 - 0.35 * env)
    mix = mix / np.abs(mix).max() * 0.95
    write_wav(os.path.join(OUT, "mix.wav"), mix)
    write_wav(os.path.join(OUT, "mix_ohne_musik.wav"), (voice + 0.55 * fx * (1 - 0.35 * env)) / np.abs(mix).max() * 0.95)
    if "--audio" in sys.argv:
        return

    # ---------------- Bild
    subprocess.run(["node", os.path.join(HERE, "anim", "render.js"), os.path.join(OUT, "timing.json"), OUT, "4"], check=True)
    for name, wav in (("video_final.mp4", "mix.wav"), ("video_ohne_musik.mp4", "mix_ohne_musik.wav")):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(OUT, "silent.mp4"), "-i", os.path.join(OUT, wav),
                        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium",
                        "-crf", "19", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-r", "30",
                        "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart", "-shortest", os.path.join(OUT, name)], check=True)
    print("fertig:", os.path.join(OUT, "video_final.mp4"))


if __name__ == "__main__":
    main()
