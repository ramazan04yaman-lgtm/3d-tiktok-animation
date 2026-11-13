import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface GLBModelProps {
  url: string;
  /**
   * Called once with all named nodes of the GLB. Blender object names are preserved by the
   * glTF exporter, so artists name parts (e.g. "HeatingElement", "Lid") and the animation
   * code looks them up here.
   */
  onParts?: (parts: Record<string, THREE.Object3D>) => void;
  /** Optional per-mesh material override (e.g. add clipping planes for a section cut). */
  adaptMaterial?: (mesh: THREE.Mesh) => void;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** Loads a Blender-exported .glb (Draco not required) and exposes its parts by name. */
export function GLBModel({ url, onParts, adaptMaterial, castShadow = true, receiveShadow = true }: GLBModelProps) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useEffect(() => {
    const parts: Record<string, THREE.Object3D> = {};
    scene.traverse((o) => {
      if (o.name) parts[o.name] = o;
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = castShadow;
        m.receiveShadow = receiveShadow;
        adaptMaterial?.(m);
      }
    });
    onParts?.(parts);
  }, [scene, onParts, adaptMaterial, castShadow, receiveShadow]);
  return <primitive object={scene} />;
}
