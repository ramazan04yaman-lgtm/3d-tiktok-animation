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
