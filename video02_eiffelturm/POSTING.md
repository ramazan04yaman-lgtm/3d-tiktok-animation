# Video 02 – Victor Lustig: Der Mann, der den Eiffelturm verkaufte

**Datei (v2, aktuell):** `victor_lustig_eiffelturm_v2.mp4` (1080×1920, 30 fps, ~69,9 s)  
**Alte Version:** `victor_lustig_eiffelturm.mp4` (65,8 s)

## Caption (TikTok)
Er hat den Eiffelturm verkauft. Und wollte es gleich nochmal tun… 🗼💰 #wahregeschichte #victorlustig #eiffelturm #betrüger #szenarien #storytime #fyp #fürdich

## Skript (Voice-over)
Dieser Mann verkaufte den Eiffelturm an einen Schrotthändler.
Paris, 1925. Der Betrüger Victor Lustig las in der Zeitung, dass die Instandhaltung des Eiffelturms ein Vermögen kostete.
Also ließ er gefälschte Regierungsbriefe drucken und lud 6 Schrotthändler in ein Luxushotel ein.
Dort gab er sich als hoher Beamter aus und erklärte: Die Stadt wolle den Turm verschrotten. Aber alles müsse streng geheim bleiben.
Einer der Händler, André Poisson, wollte den Auftrag unbedingt. Doch seine Frau wurde misstrauisch.
Also gestand Lustig ihm heimlich, dass er als Beamter ein kleines Schmiergeld erwartete.
Genau das überzeugte Poisson. Denn so verhielten sich echte Beamte.
Er zahlte das Schmiergeld und den Kaufpreis für den Turm.
Kurz darauf saß Lustig mit einem Koffer voller Geld im Zug nach Wien.
Und Poisson? Der schämte sich so sehr, dass er nicht einmal zur Polizei ging.
Einen Monat später kam Lustig zurück nach Paris und versuchte es einfach noch einmal.
Diesmal ging ein Händler zur Polizei. Doch Lustig entkam rechtzeitig.
Jahre später wurde er in Amerika wegen Falschgeld verhaftet und landete im Gefängnis auf Alcatraz.
Basierend auf einer wahren Geschichte. Such nach Victor Lustig.
Und du? Hättest du den Eiffelturm gekauft? Schreib es in die Kommentare!

## Fakten & künstlerische Freiheiten
- Belegt: 1925, Zeitungsartikel über teure Instandhaltung, gefälschtes Briefpapier, sechs Schrotthändler, Hôtel de Crillon, Rolle als Ministeriumsbeamter, André Poisson, misstrauische Ehefrau, Schmiergeld-„Geständnis“, Flucht nach Wien mit Koffer voller Geld, Poisson ging nicht zur Polizei, zweiter Versuch einen Monat später, Händler ging zur Polizei, Lustig entkam; 1935 in den USA wegen Falschgeld verhaftet, später Alcatraz.
- Nachgestellt: Szenen, Gesichter, Zeitung „La Gazette“ (fiktiv), Geldregen, Händedruck vor dem Turm im Hook, Flucht bei Nacht.

## Pipeline
Gleich wie Video 01 (`build.sh`), plus Paris-Bausteine in `lib.js` (Eiffelturm, Häuser, Hotel, Zug, Presse, Alcatraz) und neue Szenen in `shots.js`.

## v2 – Verbesserungen
- Hook (0–3 s): Kamerafahrt auf den Eiffelturm, roter Stempel „VERKAUFT!“ schlägt ein (Knall, Shake), dann Händedruck, Zwinkern, Geldkoffer
- Paris 1925: Oldtimer mit Speichenrädern, Litfaßsäule mit Plakaten (u. a. „Exposition des Arts Décoratifs 1925“), Jugendstil-Métro-Eingang „Métropolitain“, Ladenschilder, Blumenkästen, Damen mit Glockenhut, Zeitungsjunge („Extrablatt!“), Citroën-Leuchtschrift am Turm (ab Juli 1925)
- Hotel: Marmorsäulen, Wandleuchter, Teppich, Champagnergläser, Zigarrenrauch
- Figuren einheitlich: Lustig immer im gleichen Anzug mit Hut (auch in der Zelle), Poisson immer mit Melone
- Mehr Mimik/Bewegung: Händler reagieren nacheinander, nicken, lehnen sich vor; Lustig gestikuliert mit beiden Händen
- Licht/Bild: Bloom auf Lichtern, Farblook, bessere Kameraperspektiven (Flüstern, Händedruck, Briefe)
- Untertitel: feste Größe, max. 2 Zeilen, aktives Wort unterstrichen, Wort-Timing per Spracherkennung (alle Sätze)
- Schnitt: Kreisblenden im Stummfilm-Stil an Kapitelwechseln (Paris 1925 / Wien / Monat später / USA)
- Musik: Akkordeon-Musette mit Swing, Spannungsaufbau bis zur Razzia, tickende Uhr bei Geheimnissen
- Ende: Frage an die Zuschauer mit JA/NEIN-Karte
