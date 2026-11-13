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
import { type Diorama, createDiorama } from './diorama.ts';
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
  /** Detaillierte Umgebungen für Nahaufnahmen (gleicher Stil wie die Figuren). */
  private hof: Diorama = createDiorama('hof');
  private dorf: Diorama = createDiorama('dorf');
  private nahSonne = new THREE.DirectionalLight('#fff4e0', 2.4);
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
    this.hof.group.visible = false;
    this.dorf.group.visible = false;
    this.scene.add(this.hof.group, this.dorf.group);
    // Schatten nur in den Nahaufnahmen (eigene Sonne, nur für die Umgebung)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.nahSonne.castShadow = true;
    this.nahSonne.shadow.mapSize.set(2048, 2048);
    this.nahSonne.shadow.radius = 3;
    this.nahSonne.shadow.bias = -0.0005;
    this.nahSonne.visible = false;
    this.scene.add(this.nahSonne, this.nahSonne.target);
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

  /** Maßstab der Nahaufnahmen: 1 Umgebungs-Einheit = 1 Figuren-Einheit (Szeneneinheiten). */
  static HOF_K = 0.0006;
  static DORF_K = 0.00042;

  /** Umgebung auf die Erde setzen (über dem höchsten Gelände, damit nichts durchschaut). */
  private place(d: Diorama, lat: number, lon: number, k: number, idx: number, personenRadiusGrad: number): number {
    const f = tangentFrame(lat, lon);
    const grad = (d.radius * k) * 180 / Math.PI;
    const r = this.platformRadius(lat, lon, grad);
    d.group.position.copy(f.up).multiplyScalar(r);
    d.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.east, f.up, f.north.clone().negate()));
    d.group.scale.setScalar(k);
    this.people.platforms[idx] = { up: f.up.clone(), cosR: Math.cos(personenRadiusGrad * Math.PI / 180), r, active: true };
    return r;
  }

  /** Kamera-Shot + Hof für Mensch Nr. 1 vorbereiten (nach setPopulation aufrufen). */
  updateFirstPerson(): void {
    const p = this.people.firstPerson();
    const k = EarthScene.HOF_K;
    const r = this.place(this.hof, p.lat, p.lon, k, 0, 0.4);
    // Kamera ca. 5 Einheiten hoch, 9 Einheiten südlich – Blick auf Mensch Nr. 1 vor seinem Haus
    SHOTS.einwohner1 = { label: `🏠 Mensch Nr. 1 (${p.city})`, lat: p.lat, lon: p.lon, dist: r + 2.3 * k, tilt: (4.6 * k) * 180 / Math.PI,
      focus: r + 0.7 * k, figur: k, spin: 0.002 };
  }

  /** Höhe für eine Plattform: über dem höchsten Gelände im Umkreis (Grad), damit nichts durchschaut. */
  private platformRadius(lat: number, lon: number, deg: number): number {
    let max = 0;
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
      const la = lat + (i / 8) * deg, lo = lon + (j / 8) * deg / Math.max(0.2, Math.cos(lat * Math.PI / 180));
      max = Math.max(max, sampleElevation(this.assets, la, lo));
    }
    return 1 + (Math.max(0, max) * RELIEF_EXAGGERATION) / EARTH_RADIUS_M + 0.00012;
  }

  /** Nahaufnahme der größten Menschengruppe vorbereiten (Shot "gruppe" + Dorf). */
  updateGroupShot(): void {
    const c = this.people.busiestCity();
    if (!c.count) return;
    const k = EarthScene.DORF_K;
    const r = this.place(this.dorf, c.lat, c.lon, k, 1, 0.3);
    SHOTS.gruppe = { label: `👥 Menschengruppe (${c.city})`, lat: c.lat, lon: c.lon, dist: r + 7.5 * k, tilt: (15 * k) * 180 / Math.PI,
      focus: r + 0.5 * k, figur: k, spin: 0.0015 };
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
    // Sonnenstand: weicher Übergang zwischen den Shots – nur von der Zeit abhängig (reproduzierbar)
    const std: [number, number] = [18, 55];
    const so = (!this.director.free && SHOTS[this.director.shotName]?.sonne) || std;
    const sp = (!this.director.free && SHOTS[this.director.prevShotName]?.sonne) || std;
    const kk = this.director.free ? 1 : this.director.progress(time);
    this.sunOff = [sp[0] + (so[0] - sp[0]) * kk, sp[1] + (so[1] - sp[1]) * kk];
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
    // Umgebungen: sichtbar, wenn die Kamera in der Nähe ist (Himmel blendet beim Heranfliegen ein)
    let nah = 0;
    for (const [d, k] of [[this.hof, EarthScene.HOF_K], [this.dorf, EarthScene.DORF_K]] as const) {
      const dist = this.camera.position.distanceTo(d.group.position) / k;
      d.group.visible = d.group.position.lengthSq() > 0 && dist < d.radius * 4;
      if (d.group.visible) {
        d.update(time, dist);
        nah = Math.max(nah, THREE.MathUtils.smoothstep(dist, d.radius * 2.6, d.radius * 1.15));
        if (dist < d.radius * 2.6) {
          // Schatten-Sonne für diese Umgebung
          this.nahSonne.visible = true;
          this.nahSonne.target.position.copy(d.group.position);
          this.nahSonne.position.copy(d.group.position).addScaledVector(sunDir, 45 * k);
          const sc = this.nahSonne.shadow.camera;
          sc.left = sc.bottom = -26 * k; sc.right = sc.top = 26 * k; sc.near = 5 * k; sc.far = 100 * k;
          sc.updateProjectionMatrix();
          this.scene.fog = new THREE.Fog(new THREE.Color().setRGB(0.72, 0.86, 1.0, THREE.SRGBColorSpace), d.radius * 0.45 * k, d.radius * 0.97 * k);
        }
      }
    }
    if (nah === 0) { this.nahSonne.visible = false; this.scene.fog = null; }
    // In der Umgebung: Weltall-Elemente ausblenden, Kamera-Nahgrenze anpassen (kein Flackern)
    this.stars.visible = nah < 0.98;
    this.atmo.visible = nah < 0.98;
    if (nah > 0.98) this.clouds.visible = false;
    const nearNeu = THREE.MathUtils.clamp(altitude * 0.02, 0.000003, 0.001);
    const farNeu = nah > 0.98 ? 1 : 500;
    if (Math.abs(this.camera.near - nearNeu) > 1e-9 || this.camera.far !== farNeu) {
      this.camera.near = nearNeu; this.camera.far = farNeu; this.camera.updateProjectionMatrix();
    }
    // Volle Detailstufe, wenn die Figuren groß im Bild sind (Nahaufnahmen)
    this.people.nah = altitude < 0.03 || !!shot?.figur;
    this.people.kamera.copy(this.camera.position);
    this.people.update(time);
    this.mascot.root.visible = this.mascotVisible;
    if (this.mascotVisible) this.mascot.update(time);
    this.straw.visible = this.strawVisible;
    this.people.group.visible = this.showPeople;

    if (this.useBloom) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
