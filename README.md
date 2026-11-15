# 3d-tiktok-animation
Mein 3d Cartoon Animationprojekt

## Video bauen
Voraussetzungen: `pip install piper-tts numpy pillow`, Piper-Stimme `de_DE-thorsten-high` (Pfad via `VOICE=...`), ffmpeg, Node + Playwright.

    cd video && python3 build.py

- `video/build.py` – Skript (Text pro Szene), TTS, Timing, Kamera/Schnitt, Captions, Mix
- `video/scenes.py` – alle Illustrationen als Code (SVG)
- `video/music.py` – synthetisierte Musik
Ergebnis: `out/video_final.mp4` (mit Musik) und `out/video_ohne_musik.mp4` (für TikTok-Sound in der App)
