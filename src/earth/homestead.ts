/**
 * Das kleine Cartoon-Grundstück von Mensch Nr. 1 (Häuschen, Baum, Wasserfass).
 * Wird in der Nahaufnahme "einwohner1" gezeigt.
 */
import * as THREE from 'three';

const OUTLINE = new THREE.MeshBasicMaterial({ color: '#151826', side: THREE.BackSide });
function toon(geo: THREE.BufferGeometry, color: string, outline = 0.06): THREE.Mesh {
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color }));
  if (outline) { const o = new THREE.Mesh(geo, OUTLINE); o.scale.setScalar(1 + outline); m.add(o); }
  return m;
}

/** Maße in "Figurenhöhen" (1 = Größe einer Figur), wird außen skaliert. */
export function createHomestead(): THREE.Group {
  const g = new THREE.Group();
  const ground = toon(new THREE.CylinderGeometry(7, 7.3, 0.25, 64), '#7ccf4a', 0.01);
  ground.position.y = -0.12;
  const dirt = toon(new THREE.CylinderGeometry(7.35, 6.6, 0.6, 64), '#a8794a', 0.01);
  dirt.position.y = -0.55;
  const path = toon(new THREE.BoxGeometry(0.6, 0.03, 2.2), '#e8d29a', 0);
  path.position.set(-0.4, 0.02, 1.4);
  // Häuschen
  const house = new THREE.Group();
  const wall = toon(new THREE.BoxGeometry(1.6, 1.2, 1.3), '#fff3d6');
  wall.position.y = 0.6;
  const roof = toon(new THREE.ConeGeometry(1.35, 0.9, 4), '#ff4f4f');
  roof.position.y = 1.65; roof.rotation.y = Math.PI / 4;
  const door = toon(new THREE.BoxGeometry(0.4, 0.7, 0.05), '#8a5a33', 0);
  door.position.set(0, 0.35, 0.66);
  const win = toon(new THREE.BoxGeometry(0.35, 0.35, 0.05), '#7fd8ff', 0);
  win.position.set(0.5, 0.75, 0.66);
  house.add(wall, roof, door, win);
  house.position.set(-0.9, 0, -0.9);
  // Baum
  const trunk = toon(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 10), '#8a5a33');
  trunk.position.set(1.7, 0.4, -0.8);
  const crown = toon(new THREE.SphereGeometry(0.75, 16, 12), '#3fae3a');
  crown.position.set(1.7, 1.3, -0.8);
  // Wasserfass
  const barrel = toon(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16), '#2f9bff');
  barrel.position.set(1.2, 0.35, 1.0);
  const water = toon(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 16), '#bff0ff', 0);
  water.position.set(1.2, 0.71, 1.0);
  // Schild "EINWOHNER 1" wird als Sticker gezeigt, hier ein Pfosten mit Fähnchen
  const pole = toon(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), '#ffffff', 0.15);
  pole.position.set(-2.2, 0.8, 0.8);
  const flag = toon(new THREE.BoxGeometry(0.6, 0.38, 0.03), '#1593ff', 0.1);
  flag.position.set(-1.9, 1.4, 0.8);
  // ein paar Büsche und Blumen am Rand
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3, r = 4.2 + (i % 3) * 0.9;
    const bush = toon(new THREE.SphereGeometry(0.35 + (i % 2) * 0.2, 12, 10), i % 4 === 0 ? '#ffcf3a' : '#4fbf3f');
    bush.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
    g.add(bush);
  }
  g.add(ground, dirt, path, house, trunk, crown, barrel, water, pole, flag);
  return g;
}
