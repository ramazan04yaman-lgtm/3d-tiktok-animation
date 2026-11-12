import * as THREE from 'three';

/** Erdradius in Metern – 1 Einheit in der 3D-Szene = 1 Erdradius. */
export const EARTH_RADIUS_M = 6_371_000;
const D2R = Math.PI / 180;

/**
 * Breite/Länge (Grad) -> Punkt auf der Kugel.
 * Konvention (auch im Shader!): x = cos(lat)cos(lon), y = sin(lat), z = -cos(lat)sin(lon)
 */
export function latLonToVec3(lat: number, lon: number, r = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const la = lat * D2R, lo = lon * D2R;
  return out.set(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
}

export function vec3ToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const n = v.clone().normalize();
  return { lat: Math.asin(n.y) / D2R, lon: Math.atan2(-n.z, n.x) / D2R };
}

/** Lokale Richtungen an einem Ort: Osten und Norden (Einheitsvektoren). */
export function tangentFrame(lat: number, lon: number) {
  const la = lat * D2R, lo = lon * D2R;
  const east = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo));
  const north = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
  const up = latLonToVec3(lat, lon);
  return { east, north, up };
}
