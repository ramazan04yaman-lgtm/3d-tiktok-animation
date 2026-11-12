# „Was wäre wenn“ – TikTok-Pipeline (100 % Code)

1. Skript: `src/script.json` (Szene, Label, Text, hervorgehobene Wörter)
2. Stimme: `python3 src/voice.py` (Piper TTS, Stimme `de-thorsten-low`, liegt unter /tmp/tts)
3. Musik: `python3 src/music.py` (eigene, prozedural erzeugte Musik)
4. Video: `cd src && npm i && cd .. && node src/render.js` → `build/video.mp4`
   Vorschau einzelner Sekunden: `node src/render.js 1.5 10 20`

Fertige Videos liegen in `output/`.
