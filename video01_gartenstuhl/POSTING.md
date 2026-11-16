# Video 01 – Lawnchair Larry (Gartenstuhl + 45 Ballons)

**Datei:** `lawnchair_larry_final.mp4` (1080×1920, 30 fps, 57,8 s)

## Caption (TikTok)
Er wollte nur ein paar Meter schweben… 🎈🪑 #wahregeschichte #lawnchairlarry #szenarien #storytime #fyp #fürdich #crazy #1982

## Skript (Voice-over)
Er band 45 Wetterballons an seinen Gartenstuhl und flog damit fast 5000 Meter hoch.
Seit er 13 war, träumte er vom Fliegen. Doch Pilot durfte er nie werden, wegen seiner schlechten Augen.
Also kaufte er Wetterballons und füllte sie mit Helium. Er band sie an seinen Gartenstuhl und packte Sandwiches, Bier, ein Funkgerät und ein Luftgewehr ein.
Sein Plan: ein paar Meter über dem Garten schweben, dann ein paar Ballons abschießen und landen.
Doch als seine Freunde das Seil kappten, schoss er wie eine Rakete in den Himmel.
Er hatte solche Angst, dass er sich nicht traute, auch nur einen Ballon abzuschießen.
Und er trieb direkt in die Flugroute des Flughafens von Long Beach.
Ein Pilot meldete dem Tower: Da fliegt ein Mann in einem Gartenstuhl!
Nach 45 Minuten schoss er endlich ein paar Ballons ab und begann zu sinken. Doch dann fiel ihm das Gewehr aus der Hand.
Kurz vor dem Boden verfing er sich in einer Stromleitung. Ein ganzes Viertel war 20 Minuten ohne Strom.
Unten wartete schon die Polizei und nahm ihn sofort fest.
Als ein Reporter fragte, warum er das getan hat, sagte er nur: Ein Mann kann nicht einfach nur rumsitzen.
Basierend auf einer wahren Geschichte. Such nach Lawnchair Larry.

## Pipeline (alles Code, keine Bild-/Video-KI)
- `script.json` – Sätze + Shot-Liste
- `tts.py` – Voice-over (Piper TTS, Stimme de_DE-thorsten-high) + Wort-Timings
- `lib.js`, `shots.js`, `index.html` – prozedurale 3D-Szenen (Three.js)
- `render.js` – Headless-Chromium-Renderer (4 Worker)
- `music.py` – eigener, code-generierter Musiktrack
- `build.sh` – komplette Pipeline
