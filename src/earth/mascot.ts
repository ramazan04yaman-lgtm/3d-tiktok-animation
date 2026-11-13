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
export class Mascot {
  readonly root = new THREE.Group();
  private ch: Character;
  private mund!: THREE.Mesh;
  talking = false;
  waving = false;
  drinking = false;

  constructor() {
    this.ch = createCharacter({ skin: '#ffe0c4', hair: '#3a2416', hairStyle: 99, shirt: '#2f6be0', pants: '#1b2340', shoes: '#ffffff' });
    const head = this.ch.joints.head, body = this.ch.joints.body;
    const H = P.headY, R = P.headR;
    // Kapitänsmütze
    const crown = part(new THREE.CylinderGeometry(R * 1.05, R * 0.95, 0.24, 40), '#ffffff', 0.02);
    crown.position.set(0, H + R * 0.78, -0.02); crown.rotation.x = -0.12;
    const top = part(new THREE.CylinderGeometry(R * 1.25, R * 1.05, 0.08, 40), '#ffffff', 0.02);
    top.position.set(0, H + R * 0.78 + 0.14, -0.035); top.rotation.x = -0.12;
    const band = part(new THREE.CylinderGeometry(R * 0.92, R * 0.92, 0.07, 40), '#1b1f33', 0.01);
    band.position.set(0, H + R * 0.66, -0.01); band.rotation.x = -0.12;
    const visor = part(new THREE.CylinderGeometry(R * 0.8, R * 0.8, 0.03, 32, 1, false, -Math.PI / 2, Math.PI), '#1b1f33', 0.02);
    visor.position.set(0, H + R * 0.6, 0.12); visor.rotation.x = 0.2;
    const emblem = part(new THREE.SphereGeometry(0.055, 16, 12), '#ffd23a', 0.03, { emissive: '#553b00' });
    emblem.scale.z = 0.4; emblem.position.set(0, H + R * 0.83, R * 0.92);
    // Sonnenbrille (über den großen Augen)
    const lensGeo = new THREE.BoxGeometry(0.21, 0.14, 0.03, 2, 2, 1);
    for (const x of [-0.115, 0.115]) {
      const lens = part(lensGeo, '#0d0f1a', 0.04, { roughness: 0.15, metalness: 0.2 });
      lens.position.set(x * 1.12, H + 0.045, R * 0.95); lens.rotation.y = x * 0.9;
      head.add(lens);
    }
    for (const x of [-0.115, 0.115]) {
      const glanz = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      glanz.position.set(x * 1.12 - 0.04, H + 0.075, R * 0.95 + 0.025); glanz.rotation.y = x * 0.9; head.add(glanz);
    }
    // roter, offener Mund (wie im Original) statt des einfachen Lächelns
    this.mund = part(new THREE.SphereGeometry(0.075, 20, 12), '#8a1f2e', 0.03);
    this.mund.scale.set(1.25, 0.45, 0.45); this.mund.position.set(0, H - 0.1, R * 0.9);
    this.ch.mouth.visible = false;
    head.add(this.mund);
    // weißer Kragen + rote Krawatte
    const kragen = part(new THREE.ConeGeometry(0.12, 0.16, 3), '#ffffff', 0.02);
    kragen.rotation.set(Math.PI, 0, 0); kragen.scale.z = 0.45; kragen.position.set(0, 0.6, 0.15); body.add(kragen);
    const kraw = part(new THREE.ConeGeometry(0.035, 0.16, 4), '#ff4f5e', 0.02);
    kraw.rotation.x = Math.PI; kraw.scale.z = 0.5; kraw.position.set(0, 0.53, 0.19); body.add(kraw);
    // rot-weiß gestreifter Strohhalm im Becher
    const tex = stripeTexture();
    const halm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 10), smooth('#ffffff', { map: tex }));
    halm.position.set(P.shoulder.x + 0.05, P.shoulder.y - 0.16, 0.07); halm.rotation.z = -0.25;
    this.ch.joints.armR.add(halm);
    const bridge = part(new THREE.BoxGeometry(0.07, 0.025, 0.025), '#0d0f1a', 0);
    bridge.position.set(0, H + 0.07, R * 1.0);
    head.add(crown, top, band, visor, emblem, bridge);
    // Uniform: goldene Knöpfe + Abzeichen mit Wassertropfen
    for (const y of [0.42, 0.34]) {
      const b = part(new THREE.SphereGeometry(0.025, 10, 8), '#ffd23a', 0.015, { emissive: '#553b00' });
      b.position.set(0, y, 0.19); body.add(b);
    }
    const badge = part(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 20), '#2fb4ff', 0.02);
    badge.rotation.x = Math.PI / 2; badge.position.set(-0.1, 0.55, 0.17); body.add(badge);
    this.root.add(this.ch.root);
    this.root.scale.setScalar(2.0);    // Moderator steht groß im Vordergrund
  }

  update(t: number): void {
    const talk = this.talking ? 0.6 + 0.9 * Math.max(0, Math.sin(t * 17) * Math.sin(t * 6.3 + 1)) : 0.6;
    this.mund.scale.set(1.25, 0.45 * talk / 0.6, 0.45);
    this.ch.setPose({
      legL: 0, legR: 0, armL: Math.sin(t * 2) * 0.05, armR: 0,
      liftL: this.waving ? 0.85 + Math.sin(t * 9) * 0.12 : 0.05,
      liftR: 0.05, drink: this.drinking ? 0.85 + Math.sin(t * 3) * 0.1 : 0,
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
