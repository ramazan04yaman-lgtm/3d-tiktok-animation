/**
 * KAPITÄN DURST – unser Cartoon-Moderator (eigene Figur).
 * Gebaut aus einfachen Formen mit Toon-Schattierung + schwarzer Kontur,
 * damit er wie eine 3D-Cartoonfigur aussieht.
 */
import * as THREE from 'three';

function toonGradient(): THREE.DataTexture {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const GRAD = toonGradient();
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#151826', side: THREE.BackSide });

function part(geo: THREE.BufferGeometry, color: string, outline = 0.035, opts: Partial<THREE.MeshToonMaterialParameters> = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...opts }));
  if (outline > 0) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(1 + outline);
    m.add(o);
  }
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

export class Mascot {
  readonly root = new THREE.Group();
  private head = new THREE.Group();
  private mouth: THREE.Mesh;
  private armR = new THREE.Group();
  private armL = new THREE.Group();
  private body = new THREE.Group();
  talking = false;
  waving = false;
  drinking = false;

  constructor() {
    const skin = '#f4c49c', jacket = '#1f4fbf', dark = '#1b1f33';
    // Beine + Schuhe
    for (const x of [-0.17, 0.17]) {
      const leg = part(new THREE.CapsuleGeometry(0.12, 0.35, 4, 12), dark);
      leg.position.set(x, 0.32, 0);
      const shoe = part(new THREE.SphereGeometry(0.15, 16, 12), '#ffffff');
      shoe.scale.set(1, 0.6, 1.5); shoe.position.set(x, 0.07, 0.06);
      this.body.add(leg, shoe);
    }
    // Körper (Jacke)
    const torso = part(new THREE.CapsuleGeometry(0.36, 0.42, 6, 20), jacket);
    torso.position.y = 0.95;
    const shirt = part(new THREE.ConeGeometry(0.17, 0.3, 3), '#ffffff', 0.03);
    shirt.rotation.set(Math.PI, 0, 0); shirt.position.set(0, 1.22, 0.3); shirt.scale.z = 0.4;
    const tie = part(new THREE.ConeGeometry(0.05, 0.22, 4), '#ff3b5c', 0.04);
    tie.rotation.x = Math.PI; tie.position.set(0, 1.15, 0.36); tie.scale.z = 0.5;
    this.body.add(tie);
    const badge = part(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), '#ffd23a', 0.03, { emissive: '#553b00' });
    badge.rotation.x = Math.PI / 2; badge.position.set(0, 0.9, 0.36);
    const drop = part(new THREE.SphereGeometry(0.045, 12, 10), '#2fb4ff', 0);
    drop.position.set(0, 0.9, 0.385);
    for (const y of [0.78, 0.66]) {
      const b = part(new THREE.SphereGeometry(0.035, 10, 8), '#ffd23a', 0);
      b.position.set(0.16, y, 0.33); this.body.add(b);
    }
    this.body.add(torso, shirt, badge, drop);

    // Arme (Gelenk an der Schulter)
    const mkArm = (g: THREE.Group, side: number) => {
      g.position.set(0.42 * side, 1.25, 0);
      const arm = part(new THREE.CapsuleGeometry(0.1, 0.42, 4, 10), jacket);
      arm.position.y = -0.3;
      const hand = part(new THREE.SphereGeometry(0.12, 14, 10), skin);
      hand.position.y = -0.6;
      g.add(arm, hand);
      this.body.add(g);
    };
    mkArm(this.armR, -1);
    mkArm(this.armL, 1);
    // Becher mit Strohhalm in der linken Hand
    const cup = new THREE.Group();
    const cupBody = part(new THREE.CylinderGeometry(0.16, 0.12, 0.38, 20), '#e8f7ff', 0.03, { transparent: true, opacity: 0.95 });
    const water = part(new THREE.CylinderGeometry(0.145, 0.115, 0.3, 20), '#2fb4ff', 0);
    water.position.y = -0.03;
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10), new THREE.MeshToonMaterial({ map: stripeTexture(), gradientMap: GRAD }));
    straw.position.set(0.05, 0.3, 0); straw.rotation.z = -0.25;
    cup.add(cupBody, water, straw);
    cup.position.set(0, -0.72, 0.1);
    this.armL.add(cup);

    // Kopf
    const headBall = part(new THREE.SphereGeometry(0.55, 32, 24), skin);
    headBall.scale.set(1, 0.95, 0.92);
    for (const x of [-0.55, 0.55]) {
      const ear = part(new THREE.SphereGeometry(0.11, 12, 10), skin);
      ear.position.set(x, -0.02, 0); this.head.add(ear);
    }
    // Sonnenbrille
    const glassMat = { color: '#0d0f1a', specular: '#ffffff' };
    for (const x of [-0.2, 0.2]) {
      const lens = part(new THREE.BoxGeometry(0.32, 0.2, 0.06, 2, 2, 1), glassMat.color, 0.05);
      lens.position.set(x, 0.06, 0.48);
      lens.rotation.y = x * 0.4;
      const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      shine.position.set(-0.07, 0.04, 0.035); lens.add(shine);
      this.head.add(lens);
    }
    const bridge = part(new THREE.BoxGeometry(0.12, 0.04, 0.04), '#0d0f1a', 0);
    bridge.position.set(0, 0.1, 0.52);
    // Bäckchen
    for (const x of [-0.3, 0.3]) {
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.7 }));
      cheek.position.set(x, -0.12, 0.47); cheek.rotation.y = x * 1.1; this.head.add(cheek);
    }
    // Mund (wird beim Sprechen bewegt)
    this.mouth = part(new THREE.SphereGeometry(0.1, 20, 12), '#4a0f1c', 0.04);
    this.mouth.scale.set(1.3, 0.35, 0.35);
    this.mouth.position.set(0, -0.26, 0.47);
    // Kapitänsmütze
    const hat = new THREE.Group();
    const crown = part(new THREE.CylinderGeometry(0.5, 0.46, 0.26, 32), '#ffffff');
    crown.position.y = 0.52;
    const top = part(new THREE.CylinderGeometry(0.58, 0.5, 0.08, 32), '#ffffff');
    top.position.y = 0.68;
    const band = part(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 32), '#1b1f33', 0.02);
    band.position.y = 0.43;
    const visor = part(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32, 1, false, -Math.PI / 2, Math.PI), '#1b1f33');
    visor.position.set(0, 0.38, 0.12); visor.rotation.x = 0.25;
    const emblem = part(new THREE.SphereGeometry(0.08, 14, 10), '#ffd23a', 0.04, { emissive: '#553b00' });
    emblem.scale.z = 0.4; emblem.position.set(0, 0.53, 0.49);
    hat.add(crown, top, band, visor, emblem);
    hat.rotation.z = 0.08;
    this.head.add(headBall, bridge, this.mouth, hat);
    this.head.position.y = 1.85;
    this.body.add(this.head);
    this.root.add(this.body);
  }

  update(t: number): void {
    this.body.position.y = Math.abs(Math.sin(t * 3)) * 0.04;
    this.body.rotation.y = Math.sin(t * 0.8) * 0.12;
    this.head.rotation.z = Math.sin(t * 1.7) * 0.06;
    this.head.rotation.x = Math.sin(t * 2.3) * 0.04;
    const open = this.talking ? 0.3 + 0.6 * Math.max(0, Math.sin(t * 17) * Math.sin(t * 6.3 + 1)) : 0.3;
    this.mouth.scale.y = open;
    this.armR.rotation.z = this.waving ? -2.5 + Math.sin(t * 9) * 0.35 : -0.15 + Math.sin(t * 2) * 0.05;
    this.armR.rotation.x = 0;
    if (this.drinking) {
      this.armL.rotation.z = 2.3; this.armL.rotation.x = -0.6;
    } else {
      this.armL.rotation.z = 0.5 + Math.sin(t * 2.2) * 0.05; this.armL.rotation.x = -0.5;
    }
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
