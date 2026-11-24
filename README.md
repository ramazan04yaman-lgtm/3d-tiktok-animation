# 3d-tiktok-animation

Szenario-Videos (DE, 9:16, 1080×1920, 30 fps), komplett per Code erzeugt, ohne Bild- oder Video-KI.

## Neues Video
1. `videos/<nr-name>/script.json` anlegen (Segmente: `scene`, `label`, `text`)
2. `python3 tools/audio.py videos/<nr-name>`: Voice-over (Piper, lokal), Timeline, Musik, SFX, Mix
3. `node tools/render.js videos/<nr-name> --workers 4`: rendert in `output/<nr-name>.mp4` (+ `_nur-stimme.mp4`)
   - Vorschau-Stills: `--preview 1,5,10`

Setup: `npm i`, `pip install piper-tts numpy`, Stimme nach `voices/de_thorsten.onnx(.json)`
(https://huggingface.co/rhasspy/piper-voices/tree/main/de/de_DE/thorsten/high).

Szenen in `src/scene.js` (Three.js): `hook`/`dark`/`outro` (Stadt + Mond), `tide` (Küste), `rhythm` (Riff), `tilt`/`chaos` (Erde im All).

## Bau-Videos (Klemmbausteine)
Modelle: `src/brick/dragon.js`, `car.js`, `blaster.js` (+ gleichnamige `.html`). Ablauf pro Video:
1. Modell bauen (Voxel-Form `shape()`, Bauteil-Reihenfolge `ORDER`), Konzept-Stills (`tools/*-stills.js`)
2. Sprechtext → Creator nimmt auf → `videos/<nr>/voice/stimme.mp3`
3. Wortzeiten: Whisper (`HF_HUB_DISABLE_XET=1`, Modell „small“, aus 16-kHz-WAV) → `voice/words.json`
4. `node tools/render.js videos/<nr> --page src/brick/<modell>.html --counts`
5. `python3 tools/brick_voice.py videos/<nr> --pause <Satzanfang>=<Sek> ...` (Ziel ≈ 60 s)
6. Vorschau `--preview 5,20,...`, dann Render `--workers 4`, danach mit loudnorm (-14 LUFS) komprimieren
Klick-Lautstärke: `CLICK` in `tools/brick_audio.py`. Aktuelles Projekt: `videos/05-villa/PROJEKT.md`.
