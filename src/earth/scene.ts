/** Baut die komplette 3D-Szene zusammen und zeichnet sie. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { seaLevelForDriedArea } from '../sim/visualScale.ts';
import { type EarthAssets, loadAssets, sampleElevation } from './assets.ts';
import { CameraDirector } from './camera.ts';
import { createEarthMaterial } from './earthMaterial.ts';
import { EARTH_RADIUS_M, latLonToVec3, tangentFrame } from './geo.ts';
import { RELIEF_EXAGGERATION } from './earthMaterial.ts';
import { Mascot, createGiantStraw } from './mascot.ts';
import { createHomestead, createVillage } from './homestead.ts';
import { SHOTS } from './camera.ts';
import { People } from './people.ts';
import { createAtmosphere, createClouds, createStars, createSun } from './sky.ts';

export class EarthScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.001, 500);
  director!: CameraDirector;
  controls!: OrbitControls;
  assets!: EarthAssets;
  people!: People;
  private earthMat!: THREE.ShaderMaterial;
  private clouds!: ReturnType<typeof createClouds>;
  private atmo!: ReturnType<typeof createAtmosphere>;
  private stars!: THREE.Points;
  private sun!: THREE.Sprite;
  private sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  /** Angezeigter Austrocknungsgrad 0..1 (läuft weich zum Zielwert). */
  drainShown = 0;
  drainTarget = 0;
  showClouds = true;
  showPeople = true;
  mascot!: Mascot;
  mascotVisible = false;
  strawVisible = false;
  previewActive = false;
  private straw!: THREE.Object3D;
  private homestead = createHomestead();
  private village = createVillage();
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  /** Leuchteffekt (Bloom) an/aus. */
  useBloom = true;
  private sunOff: [number, number] = [18, 55];
  /** Größe einer Figur in der Nahaufnahme von Mensch Nr. 1. */
  static CLOSEUP_SIZE = 0.0032;
  readonly info = { seaLevel: 0 };

  readonly canvas: HTMLCanvasElement;
  /** Kugel-Auflösung (weniger = schneller beim Rendern ohne Grafikkarte). */
  segments = 1024;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#02040c');
  }

  async init(onProgress?: (p: number) => void): Promise<void> {
    this.assets = await loadAssets(this.renderer, onProgress);
    this.earthMat = createEarthMaterial(this.assets);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, this.segments, this.segments / 2), this.earthMat);
    this.clouds = createClouds(this.assets);
    this.atmo = createAtmosphere();
    this.stars = createStars();
    this.sun = createSun();
    this.people = new People(this.assets);
    this.scene.add(earth, this.clouds, this.atmo, this.stars, this.sun, this.people.group, this.sunLight,
      new THREE.HemisphereLight('#bfe3ff', '#3a2a1a', 0.55));
    // Moderator: hängt an der Kamera (steht immer vorne im Bild, unten mittig)
    this.mascot = new Mascot();
    this.mascot.root.scale.setScalar(0.2);
    this.mascot.root.position.set(0, -0.47, -1.2);
    this.mascot.root.rotation.y = -0.15;
    const key = new THREE.DirectionalLight('#ffffff', 1.1);
    key.position.set(-1, 1.5, 1);
    this.camera.add(this.mascot.root, key);
    this.scene.add(this.camera);
    // Riesen-Strohhalm im Atlantik
    const f = tangentFrame(26, -42);
    this.straw = createGiantStraw();
    this.straw.position.copy(f.up);
    this.straw.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.east, f.up, f.north.clone().negate()));
    this.scene.add(this.straw);
    this.homestead.visible = false;
    this.village.visible = false;
    this.scene.add(this.homestead, this.village);
    // Nachbearbeitung: sanftes Leuchten (Sonnenspiegelung, Atmosphäre, Stadtlichter)
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.55, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.director = new CameraDirector(this.camera);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.03;
    this.controls.maxDistance = 8;
    this.controls.addEventListener('start', () => { this.director.free = true; });
  }

  /** Kamera-Shot + Grundstück für Mensch Nr. 1 vorbereiten (nach setPopulation aufrufen). */
  updateFirstPerson(): void {
    const p = this.people.firstPerson();
    SHOTS.einwohner1 = { label: `🏠 Mensch Nr. 1 (${p.city})`, lat: p.lat, lon: p.lon, dist: 1.034, tilt: 1.6, focus: 1, figur: EarthScene.CLOSEUP_SIZE, spin: 0.25 };
    const f = tangentFrame(p.lat, p.lon);
    const r = this.platformRadius(p.lat, p.lon, 1.6);
    this.homestead.position.copy(f.up).multiplyScalar(r);
    this.people.platforms[0] = { up: f.up.clone(), cosR: Math.cos(0.4 * Math.PI / 180), r, active: true };
    this.homestead.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.east, f.up, f.north.clone().negate()));
    this.homestead.scale.setScalar(EarthScene.CLOSEUP_SIZE * 1.35);
  }

  /** Höhe für eine Plattform: über dem höchsten Gelände im Umkreis (Grad), damit nichts durchschaut. */
  private platformRadius(lat: number, lon: number, deg: number): number {
    let max = 0;
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      const la = lat + (i / 6) * deg, lo = lon + (j / 6) * deg / Math.max(0.2, Math.cos(lat * Math.PI / 180));
      max = Math.max(max, sampleElevation(this.assets, la, lo));
    }
    return 1 + (max * RELIEF_EXAGGERATION) / EARTH_RADIUS_M + 0.00012;
  }

  /** Nahaufnahme der größten Menschengruppe vorbereiten (Shot "gruppe" + Dorf). */
  updateGroupShot(): void {
    const c = this.people.busiestCity();
    if (!c.count) return;
    SHOTS.gruppe = { label: `👥 Menschengruppe (${c.city})`, lat: c.lat, lon: c.lon, dist: 1.0062, tilt: 0.62, focus: 1, figur: 0.00042, spin: 0.08 };
    const f = tangentFrame(c.lat, c.lon);
    const r = this.platformRadius(c.lat, c.lon, 0.5);
    this.village.position.copy(f.up).multiplyScalar(r);
    this.people.platforms[1] = { up: f.up.clone(), cosR: Math.cos(0.3 * Math.PI / 180), r, active: true };
    this.village.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.east, f.up, f.north.clone().negate()));
    this.village.scale.setScalar(0.00042 * 1.4);
  }

  setFreeCamera(on: boolean): void {
    this.controls.enabled = on;
    if (on) { this.director.free = true; this.controls.target.set(0, 0, 0); }
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer?.setPixelRatio(pixelRatio);
    this.composer?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    (this.stars.material as THREE.ShaderMaterial).uniforms.uPixel.value = pixelRatio * Math.max(1, height / 900);
  }

  render(time: number, dt: number): void {
    // Wasserstand weich zum Ziel bewegen (sichtbares Absinken)
    const k = 1 - Math.exp(-dt * 1.2);
    this.drainShown += (this.drainTarget - this.drainShown) * k;
    if (Math.abs(this.drainTarget - this.drainShown) < 1e-5) this.drainShown = this.drainTarget;
    const v = this.drainShown;
    const sea = seaLevelForDriedArea(this.assets.hypsometry, v);
    this.info.seaLevel = sea;
    const u = this.earthMat.uniforms;
    u.uSeaLevel.value = sea;
    u.uLakeDrain.value = Math.min(1.05, v * 2.2);
    u.uRiverDrain.value = Math.min(1, v * 3);
    u.uDryness.value = Math.min(1, v * 1.4);
    u.uTime.value = time;
    u.uHaze.value = THREE.MathUtils.smoothstep(this.camera.position.length(), 1.1, 2.5) * 0.45 + 0.12;

    // Kamera
    let c: { lat: number; lon: number; dist: number };
    if (this.controls.enabled && this.director.free) {
      this.controls.update();
      this.director.syncFromCamera();
      c = this.director.state;
    } else {
      c = this.director.update(time);
    }
    // Sonne: leicht seitlich hinter der Kamera -> schöne Tag/Nacht-Grenze im Bild
    const so = (!this.director.free && SHOTS[this.director.shotName]?.sonne) || [18, 55];
    // weicher Übergang des Sonnenstands zwischen Shots
    this.sunOff[0] += (so[0] - this.sunOff[0]) * Math.min(1, dt * 1.5);
    this.sunOff[1] += (so[1] - this.sunOff[1]) * Math.min(1, dt * 1.5);
    const sunDir = latLonToVec3(c.lat + this.sunOff[0], c.lon + this.sunOff[1]).normalize();
    u.uSunDir.value.copy(sunDir);
    this.clouds.material.uniforms.uSunDir.value.copy(sunDir);
    this.atmo.material.uniforms.uSunDir.value.copy(sunDir);
    this.sunLight.position.copy(sunDir).multiplyScalar(10);
    this.sun.position.copy(sunDir).multiplyScalar(80);

    const cloudRot = time * 0.006;
    this.clouds.rotation.y = cloudRot;
    u.uCloudRot.value = cloudRot;
    this.clouds.visible = this.showClouds;
    // Wolken beim Heranzoomen ausblenden, damit man die Küsten sieht
    this.clouds.material.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(c.dist, 1.08, 1.6) * 0.95;
    this.clouds.material.uniforms.uTime.value = time;
    (this.stars.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

    // Menschen: Größe passend zum Kameraabstand
    const altitude = Math.max(0.01, this.camera.position.length() - 1);
    const shot = this.director.free ? undefined : SHOTS[this.director.shotName];
    this.people.figureSize = shot?.figur ?? THREE.MathUtils.clamp(altitude * 0.0065, 0.0006, 0.009);
    this.homestead.visible = !this.director.free && this.director.shotName === 'einwohner1';
    this.village.visible = !this.director.free && this.director.shotName === 'gruppe';
    this.people.update(time);
    this.mascot.root.visible = this.mascotVisible;
    if (this.mascotVisible) this.mascot.update(time);
    this.straw.visible = this.strawVisible;
    this.people.group.visible = this.showPeople;

    if (this.useBloom) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
