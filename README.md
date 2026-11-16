# 3d-tiktok-animation

Szenario-Videos („Was wäre, wenn…“) – komplett per Code erzeugt, ohne Bild- oder Video-KI.

## Format (aus den Referenzvideos abgeleitet)
- **Hook (0–2 s):** „Wenn ein [Tier] in [Umgebung] …“ + direkt das Problem. Subjekt mittig, Umriss-Glow beim Namen, Serien-Badge („Teil 1“).
- **Kette:** Problem → „Also …“ (Anpassung) → „Aber …“ (neues Problem) → … ca. 6–7 Runden, 1 Satz ≈ 1 Schnitt (2–4 s).
- **Visualisierung:** Anpassung passiert *sichtbar am Körper* (Farbwechsel-Wipe, Querschnitte, Makro-Einschübe, Thermometer, Pfeile, Maß-Klammern).
- **Text:** ein Wort zur Zeit, Großbuchstaben, weiß mit schwarzem Rand, Bildmitte unten; dazu Pillen-Labels mit Emoji.
- **Ende:** „Glückwunsch, du hast einen [Tier] gebaut.“
- 9:16, ~45–50 s, ruhige Musik + Wind/SFX unter dem Voice-over.

## Video 1: Eisbär (`eisbaer/`)
```
eisbaer/script.json   Skript (ein Satz = ein Shot)
eisbaer/voice.py      Voice-over (Piper TTS, lokal) + Wort-Timings
eisbaer/audio.py      eigene Musik + SFX synthetisiert, Mix mit Ducking
eisbaer/scene.js      Three.js-Szene: Bär mit Shell-Fell, Robbe, Makros, UI
eisbaer/render.js     Headless-Chromium-Frame-Renderer
eisbaer/make.sh       komplette Pipeline -> eisbaer_tiktok.mp4
```
