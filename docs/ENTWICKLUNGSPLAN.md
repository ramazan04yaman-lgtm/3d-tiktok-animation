# Technischer Entwicklungsplan

## Phase 1 – Fundament ✅ (dieser Stand)
- [x] Repository untersucht (enthielt nur eine README)
- [x] Projekt mit Vite + Three.js + TypeScript aufgesetzt
- [x] Echte Erddaten aufbereitet: ETOPO1-Höhen/Tiefen, Blue Marble, Wolken, Nachtlichter, Seen, Flüsse, Städte
- [x] 3D-Erde: Kontinente, Ozeane mit Tiefenfarben, Wellen, Sonnenspiegelung, Küsten-Schaum, Wolken (+ Schatten),
      Atmosphäre, Sterne, Tag/Nacht mit Stadtlichtern, Relief aus Höhendaten
- [x] Sinkender Meeresspiegel auf Basis echter Tiefendaten, trockener Meeresboden mit Salzkrusten, schrumpfende Seen/Flüsse
- [x] Rechenkern: Einwohner, 10 L/Tag, Likes/Kommentare/Shares, exakte BigInt-Rechnung
- [x] Dauerhafte Speicherung (Logbuch + Snapshot, atomar, Backups, Integritätsprüfung)
- [x] Eingabe per Bedienfeld und Terminal, Modus „Neu“ und „Gesamtstand“, Schutz vor Doppeleingaben
- [x] Menschen als animierte Cartoon-Figuren in echten Städten (Instancing)
- [x] Kamera-Shots inkl. Kamerafahrten, 9:16-Format, TikTok-HUD
- [x] 26 automatische Tests

## Phase 2 – Videoproduktion (Grundlage fertig ✅)
- [x] Drehbuch-Format, Untertitel, Sticker, Moderator, Renderer mit Stimme + Plopp-Effekten
- [ ] Bessere Stimme (eigene Aufnahme / KI-Stimme), Hintergrundmusik
- [ ] Mehr Moderator-Animationen, weitere Figuren (z. B. neue Einwohner im Bild)
- Aufnahme-Skript: Playwright rendert Bild für Bild (`window.__sim.renderAt(t)`, feste Zeit -> ruckelfrei),
  FFmpeg setzt daraus ein MP4 (1080×1920, 30/60 fps, H.264) zusammen
- Szenen-Beschreibung pro Video (JSON): Shot-Abfolge, Texteinblendungen („TAG 12“, „+1.200 MENSCHEN“),
  Zeitraffer „vorher → nachher“ (Wasserstand des letzten Videos -> heute)
- Untertitel im Stil der Beispielvideos (große, fette Wörter mit Farbakzent)
- Musik/Soundeffekte (lizenzfrei) per FFmpeg einmischen

## Phase 3 – Mehr Details
- Nahaufnahmen: detailliertere Meeresboden-Texturen, Wracks, gestrandete Schiffe, Tiere, Brunnen/Wasserflaschen
- Städte wachsen sichtbar mit der Einwohnerzahl (Häuser, Straßen); Figuren laufen auf Straßen
- Getrennte Meeresbecken (Mittelmeer, Ostsee, Schwarzes Meer) trocknen eigenständig
- Feinere Höhendaten (z. B. 2-Bogenminuten) für Küsten-Nahaufnahmen

## Phase 4 – TikTok-Daten (nur falls legitim möglich)
- Prüfen, ob eine offizielle TikTok-Schnittstelle (z. B. TikTok Display API / Research API) für das eigene
  Konto Follower-/Like-Zahlen liefert und ob die Nutzungsbedingungen das erlauben.
- Bis dahin: manuelle Eingabe (Gesamtstand-Modus).
