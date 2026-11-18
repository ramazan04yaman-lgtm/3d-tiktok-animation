/**
 * Drehbuch einer Folge (Datei in folgen/*.json).
 * Platzhalter im Text wie {einwohner} werden mit den echten Zahlen ersetzt.
 * Hervorhebung im Text:  *Wort*  = gelb,  {gruen:Wort} / {rot:Wort} / {blau:Wort} / {gelb:Wort}
 */
export type Farbe = 'gelb' | 'gruen' | 'rot' | 'blau' | 'weiss';

export type Sticker =
  | { typ: 'tag' }                                                      // großes "TAG 12"-Abzeichen
  | { typ: 'schild'; text: string; farbe?: Farbe | 'weissrot'; drehung?: number; y?: number } // schräges Schild
  | { typ: 'zahl'; label: string; von?: string | number; bis: string | number; einheit?: string; farbe?: Farbe } // zählt hoch
  | { typ: 'info'; zeilen: string[]; y?: number }                       // dunkler Infokasten
  | { typ: 'zeiger'; text: string; lat?: number; lon?: number; ziel?: 'einwohner1' } // Pfeil auf Ort oder Mensch Nr. 1
  | { typ: 'namensschild'; name: string; titel: string }                // wie "BÜRGERMEISTER LEO"
  | { typ: 'profil' }                                                   // Follower-Karte
  | { typ: 'statistik' }                                                 // komplette Wasser-Statistik (klein)
  | { typ: 'zahlen' }                                                   // große Zahlenkacheln mit allen Werten
  | { typ: 'titel'; zeilen: string[] }                                  // große Überschrift (mit Hervorhebungen)
  | { typ: 'szenario'; zeilen?: string[] }
  | { typ: 'stufen' }
  /** Ergebnisse seit dem letzten Video (wird aus den echten Zahlen berechnet). */
  | { typ: 'ergebnis'; titel?: string; follower?: boolean; zeilen?: { ico: string; label: string; anzahl: string; menge: string; leise?: boolean }[]; summe?: string };                                                  // aktuelle Verbrauchsstufe + nächste Meilensteine                             // Szenario-Karte (wird aus "szenario" berechnet)

export type Musik = 'ruhig' | 'treibend' | 'drama';
export type Effekt = 'pop' | 'whoosh' | 'tick' | 'ding' | 'gulp' | 'impact' | 'riser' | 'drop' | 'welle' | 'fanfare';
/** Was-wäre-wenn: so viele Menschen trinken so viele Tage lang (gerechnet mit den echten Regeln). */
export interface Szenario { einwohner: number; tage: number }

export interface Beat {
  /** Gesprochener Text (mit Hervorhebungen und Platzhaltern). */
  text: string;
  /** Optional: andere Aussprache für die Stimme (z. B. Zahlen ausgeschrieben). */
  sprache?: string;
  /** Kamera-Shot (siehe src/earth/camera.ts) oder "kapitaen" (Moderator im Bild). */
  kamera?: string;
  /** Übergangszeit der Kamera in Sekunden (0 = harter Schnitt). */
  uebergang?: number;
  sticker?: Sticker[];
  /** Austrocknung für die Darstellung: "jetzt" (echter Stand), Vorschau 0..1 oder "szenario"; "von" animiert. */
  wasser?: { von?: number | 'jetzt' | 'szenario'; bis: number | 'jetzt' | 'szenario' };
  /** Szenario für diesen Beat (bestimmt Wasserstand + Szenario-Karte). */
  szenario?: Szenario;
  /** Vorschau mit mehr Menschen (wird als VORSCHAU gekennzeichnet). */
  einwohner_vorschau?: number;
  /** Musikabschnitt ab diesem Beat. */
  musik?: Musik;
  /** Zusätzliche Soundeffekte (Sekunden ab Beat-Beginn). */
  effekte?: { t: number; typ: Effekt }[];
  /** Untertitel für diesen Beat ausblenden (z. B. wenn ein Titel-Sticker den Text zeigt). */
  untertitel?: boolean;
  /** Riesen-Strohhalm im Ozean zeigen. */
  strohhalm?: boolean;
  /** Kapitän winkt / trinkt. */
  aktion?: 'winken' | 'trinken';
  /** Mindestdauer in Sekunden. */
  min?: number;
  /** Zuschauerbindung (nur für den Check): Einstiegs-Frage/Problem, Überraschung in der Mitte, Cliffhanger am Ende. */
  hook?: boolean;
  /** false = Anzeige oben in diesem Satz ausblenden (z. B. freier Einstieg). */
  anzeige?: boolean;
  ueberraschung?: boolean;
  cliffhanger?: boolean;
  /** In diesem Satz landen die neuen Einwohner (seit dem Vergleichsstand) nacheinander auf dem Hof. */
  ankunft?: boolean;
  /** Eigene Sprachaufnahme statt Computerstimme (Pfad relativ zur Folgen-Datei). */
  audio?: string;
}

export interface Folge {
  titel: string;
  /** Kontoname für die Follower-Karte. */
  konto?: string;
  /**
   * Stimme:  "aufnahme" = deine eigene Aufnahme am Stück (wird an den Pausen in Sätze geschnitten),
   *          "espeak"   = Computer-Teststimme,  "keine" = ohne Stimme.
   */
  stimme?: { typ: 'espeak'; stimme?: string; tempo?: number }
    | { typ: 'piper'; modell?: string; sprecher?: number; tempo?: number;
        /** Lebendigkeit: mehr = mehr Schwankung in Ton und Rhythmus (Standard 0.6 / 0.75). */
        rauschen?: number; betonung?: number;
        /** Nachbearbeitung: zusätzlich schneller (1.06 = 6 % schneller, Tonhöhe bleibt) + Präsenz/Kompressor. */
        beschleunigen?: number; energie?: boolean }
    | { typ: 'aufnahme'; datei: string } | { typ: 'keine' };
  /** Ton: "nur-stimme" = ohne Musik und Soundeffekte. */
  ton?: 'nur-stimme' | 'voll';
  /** Anzeige oben: "kompakt" = eine schlanke Zeile + nächstes Ziel (TikTok-Format), sonst die große Anzeige. */
  anzeige?: 'kompakt' | 'voll';
  /** Vergleichsstand für "neu seit dem letzten Video": Datum oder Referenz eines Eintrags (z. B. "video-01"). */
  seit?: string;
  /** Fester Stichtag (JJJJ-MM-TT) für die Zahlen dieses Videos. Ohne Angabe: heute. */
  stichtag?: string;
  /** Ersatz-Stimme (Notiz, wird nicht automatisch benutzt). */
  stimme_ki?: Folge['stimme'];
  beats: Beat[];
}

/** Ein Untertitel-Stück (1–3 Wörter). */
export interface CaptionWord { text: string; farbe?: Farbe }
export interface Caption { start: number; end: number; words: CaptionWord[] }

export interface TimelineBeat {
  start: number;
  end: number;
  kamera: string;
  uebergang: number;
  sticker: Sticker[];
  wasser: { von: number | 'jetzt'; bis: number | 'jetzt' };
  vorschauEinwohner?: number;
  strohhalm: boolean;
  aktion?: 'winken' | 'trinken';
  sprechen: { start: number; end: number };
  /** Anzeige oben ausgeblendet. */
  anzeigeAus?: boolean;
}

export interface Timeline {
  titel: string;
  anzeige?: 'kompakt' | 'voll';
  /** TikTok-Namen der Einwohner (Index = Figur; Lücken = ohne Namen). */
  namen?: (string | null)[];
  /** Ankunft neuer Einwohner: Figuren von..bis-1 landen ab `start` im Abstand `abstand` (Sekunden). */
  ankunft?: { von: number; bis: number; start: number; abstand: number };
  konto: string;
  dauer: number;
  beats: TimelineBeat[];
  captions: Caption[];
  /** Soundeffekte (Zeitpunkt + Art). */
  events: { t: number; typ: Effekt; lautstaerke?: number }[];
  /** Musikabschnitte. */
  musik: { start: number; typ: Musik }[];
}
