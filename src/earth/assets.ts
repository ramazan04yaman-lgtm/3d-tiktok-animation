import * as THREE from 'three';
import type { Hypsometry } from '../sim/visualScale.ts';

export interface City { name: string; country: string; lat: number; lon: number; pop: number }

export interface EarthAssets {
  elevation: THREE.DataTexture;
  /** Höhen in Metern, Zeilen Nord->Süd, 2160 x 1080 (für Berechnungen in JS). */
  elevationData: Int16Array;
  elevW: number;
  elevH: number;
  land: THREE.Texture;
  mask: THREE.Texture;
  clouds: THREE.Texture;
  night: THREE.Texture;
  hypsometry: Hypsometry;
  cities: City[];
}

const BASE = `${import.meta.env.BASE_URL}assets/`;

export async function loadAssets(renderer: THREE.WebGLRenderer, onProgress?: (p: number) => void): Promise<EarthAssets> {
  const loader = new THREE.TextureLoader();
  let done = 0;
  const total = 7;
  const tick = <T>(x: T): T => { onProgress?.(++done / total); return x; };
  const tex = (name: string, srgb: boolean) => loader.loadAsync(BASE + name).then((t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.wrapS = THREE.RepeatWrapping;
    return tick(t);
  });

  const [elevBuf, land, mask, clouds, night, hypsometry, cities] = await Promise.all([
    fetch(BASE + 'elevation_2160x1080.i16').then((r) => r.arrayBuffer()).then(tick),
    tex('land_color.jpg', true),
    tex('water_mask.png', false),
    tex('clouds.jpg', false),
    tex('night_lights.jpg', false),
    fetch(BASE + 'hypsometry.json').then((r) => r.json()).then(tick),
    fetch(BASE + 'cities.json').then((r) => r.json()).then(tick),
  ]);

  const W = 2160, H = 1080;
  const elevationData = new Int16Array(elevBuf);
  // Für die Grafikkarte: Halbgenaue Gleitkommazahlen, Zeilen von Süd nach Nord (wie bei Bildern)
  const half = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W, dst = y * W;
    for (let x = 0; x < W; x++) half[dst + x] = THREE.DataUtils.toHalfFloat(elevationData[src + x]);
  }
  const elevation = new THREE.DataTexture(half, W, H, THREE.RedFormat, THREE.HalfFloatType);
  elevation.magFilter = THREE.LinearFilter;
  elevation.minFilter = THREE.LinearFilter;
  elevation.wrapS = THREE.RepeatWrapping;
  elevation.needsUpdate = true;

  return { elevation, elevationData, elevW: W, elevH: H, land, mask, clouds, night, hypsometry, cities };
}

/** Höhe (m) an einem Ort, bilinear aus den Rohdaten. */
export function sampleElevation(a: EarthAssets, lat: number, lon: number): number {
  const x = ((lon + 180) / 360) * a.elevW - 0.5;
  const y = ((90 - lat) / 180) * a.elevH - 0.5;
  const x0 = Math.floor(x), y0 = Math.max(0, Math.min(a.elevH - 2, Math.floor(y)));
  const fx = x - x0, fy = Math.max(0, Math.min(1, y - y0));
  const g = (xx: number, yy: number) => a.elevationData[yy * a.elevW + ((xx % a.elevW) + a.elevW) % a.elevW];
  return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
}
