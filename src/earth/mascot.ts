/**
 * KAPITÄN DURST – unser Cartoon-Moderator (eigene Figur).
 * Gebaut aus einfachen Formen mit Toon-Schattierung + schwarzer Kontur,
 * damit er wie eine 3D-Cartoonfigur aussieht.
 */
import * as THREE from 'three';
import { type Character, P, createCharacter, outlineMaterial, smooth } from './characters.ts';

function toonGradient(): THREE.DataTexture {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const GRAD = toonGradient();
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#151826', side: THREE.BackSide });

function part(geo: THREE.BufferGeometry, color: string, outline = 0.035, opts: THREE.MeshStandardMaterialParameters = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, smooth(color, opts));
  m.castShadow = true;
  if (outline > 0) m.add(new THREE.Mesh(geo, outlineMaterial(outline * 0.6)));
  return m;
}

function stripeTexture(alongX = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = alongX ? 256 : 64; c.height = alongX ? 64 : 256;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#ff3b5c';
    if (alongX) g.fillRect(i * 32, 0, 32, 64); else g.fillRect(0, i * 32, 64, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Kapitän Durst – gebaut aus der gemeinsamen Charakter-Bibliothek (gleicher Stil wie alle Einwohner),
 * mit Kapitänsuniform, Mütze und Sonnenbrille.
 */
/**
 * Kapitän Durst – das Vorbild für ALLE Figuren (Referenzbild).
 * Körper, Kopf, Sonnenbrille, Kragen und Krawatte kommen aus der gemeinsamen Charakter-Bibliothek;
 * dazu nur seine Kapitänsmütze, Abzeichen, Knöpfe und der Strohhalm.
 */
export class Mascot {
  readonly root = new THREE.Group();
  private ch: Character;
  private mund: THREE.Mesh;
  talking = false;
  waving = false;
  drinking = false;

  constructor() {
    this.ch = createCharacter({ skin: '#f4c49c', hair: '#ffffff', hairStyle: 0, shirt: '#1f4fbf', pants: '#1b1f33', shoes: '#ffffff', tie: '#ff3b5c' });
    const head = this.ch.joints.head, body = this.ch.joints.body;
    const S = 0.5, HY = P.headY;
    // Kapitänsmütze (Originalmaße)
    const hat = new THREE.Group();
    const crown = part(new THREE.CylinderGeometry(0.5, 0.46, 0.26, 32), '#ffffff'); crown.position.y = 0.52;
    const top = part(new THREE.CylinderGeometry(0.58, 0.5, 0.08, 32), '#ffffff'); top.position.y = 0.68;
    const band = part(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 32), '#1b1f33', 0.02); band.position.y = 0.43;
    const visor = part(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32, 1, false, -Math.PI / 2, Math.PI), '#1b1f33');
    visor.position.set(0, 0.38, 0.12); visor.rotation.x = 0.25;
    const emblem = part(new THREE.SphereGeometry(0.08, 14, 10), '#ffd23a', 0.04, { emissive: '#553b00' });
    emblem.scale.z = 0.4; emblem.position.set(0, 0.53, 0.49);
    hat.add(crown, top, band, visor, emblem);
    hat.rotation.z = 0.08;
    hat.scale.setScalar(S); hat.position.y = HY;
    head.add(hat);
    // eigener Mund zum Sprechen (der Bibliotheks-Mund bleibt für die Einwohner)
    this.ch.mouth.visible = false;
    this.mund = part(new THREE.SphereGeometry(0.1 * S, 20, 12), '#7a1626', 0.04);
    this.mund.scale.set(1.3, 0.35, 0.35); this.mund.position.set(0, HY - 0.26 * S, 0.47 * S);
    head.add(this.mund);
    // Abzeichen mit Wassertropfen + goldene Knöpfe
    const badge = part(new THREE.CylinderGeometry(0.09 * S, 0.09 * S, 0.03 * S, 20), '#ffd23a', 0.03, { emissive: '#553b00' });
    badge.rotation.x = Math.PI / 2; badge.position.set(0, 0.9 * S, 0.36 * S);
    const drop = part(new THREE.SphereGeometry(0.045 * S, 12, 10), '#2fb4ff', 0); drop.position.set(0, 0.9 * S, 0.385 * S);
    body.add(badge, drop);
    for (const y of [0.78, 0.66]) { const b = part(new THREE.SphereGeometry(0.035 * S, 10, 8), '#ffd23a', 0); b.position.set(0.16 * S, y * S, 0.33 * S); body.add(b); }
    // rot-weiß gestreifter Strohhalm im Becher
    const halm = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * S, 0.025 * S, 0.55 * S, 10), smooth('#ffffff', { map: stripeTexture() }));
    halm.position.set(P.shoulder.x + 0.03, P.shoulder.y - 0.2, 0.07); halm.rotation.z = -0.25;
    this.ch.joints.armR.add(halm);
    this.root.add(this.ch.root);
    this.root.scale.setScalar(2.0);    // Moderator steht groß im Vordergrund
  }

  update(t: number): void {
    const talk = this.talking ? 0.35 + 0.75 * Math.max(0, Math.sin(t * 17) * Math.sin(t * 6.3 + 1)) : 0.35;
    this.mund.scale.y = talk;
    this.ch.setPose({
      legL: 0, legR: 0, armL: Math.sin(t * 2) * 0.05, armR: 0,
      liftL: this.waving ? 0.85 + Math.sin(t * 9) * 0.12 : 0.04,
      liftR: 0.04, drink: this.drinking ? 0.85 + Math.sin(t * 3) * 0.1 : 0,
      headTilt: (this.drinking ? 0.3 : 0) + Math.sin(t * 2.3) * 0.04, bodyLean: Math.sin(t * 1.7) * 0.03,
    });
    this.root.position.y = Math.abs(Math.sin(t * 3)) * 0.02;
    this.root.rotation.y = Math.sin(t * 0.8) * 0.12;
  }
}

/** Riesiger rot-weißer Strohhalm, der im Atlantik steckt. */
export function createGiantStraw(): THREE.Mesh {
  const pts = [
    new THREE.Vector3(0, -0.06, 0), new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0.02, 0.5, 0),
    new THREE.Vector3(0.12, 0.62, 0), new THREE.Vector3(0.3, 0.66, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tex = stripeTexture(true);
  tex.repeat.set(5, 1);
  const geo = new THREE.TubeGeometry(curve, 80, 0.022, 20, false);
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, gradientMap: GRAD }));
  // Kontur: etwas dickere Röhre, nur Rückseiten
  m.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.026, 20, false), OUTLINE));
  return m;
}
