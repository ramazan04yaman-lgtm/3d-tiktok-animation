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
  | { typ: 'zeiger'; text: string; lat: number; lon: number }           // Schild mit Pfeil auf einen Ort der Erde
  | { typ: 'namensschild'; name: string; titel: string }                // wie "BÜRGERMEISTER LEO"
  | { typ: 'profil' }                                                   // Follower-Karte
  | { typ: 'statistik' };                                               // komplette Wasser-Statistik

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
  /** Austrocknung für die Darstellung: "jetzt" (echter Stand) oder Vorschau 0..1; "von" animiert. */
  wasser?: { von?: number | 'jetzt'; bis: number | 'jetzt' };
  /** Riesen-Strohhalm im Ozean zeigen. */
  strohhalm?: boolean;
  /** Kapitän winkt / trinkt. */
  aktion?: 'winken' | 'trinken';
  /** Mindestdauer in Sekunden. */
  min?: number;
  /** Eigene Sprachaufnahme statt Computerstimme (Pfad relativ zur Folgen-Datei). */
  audio?: string;
}

export interface Folge {
  titel: string;
  /** Kontoname für die Follower-Karte. */
  konto?: string;
  stimme?: { typ: 'espeak'; stimme?: string; tempo?: number } | { typ: 'keine' };
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
  strohhalm: boolean;
  aktion?: 'winken' | 'trinken';
  sprechen: { start: number; end: number };
}

export interface Timeline {
  titel: string;
  konto: string;
  dauer: number;
  beats: TimelineBeat[];
  captions: Caption[];
  /** Zeitpunkte für "Plopp"-Geräusche (Sticker erscheinen). */
  pops: number[];
}
