import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { ExplainerProject } from './project';

declare global {
  interface Window {
    __MX_GLB__?: () => Promise<string>;
  }
}

/** Exports the project's static model as binary glTF (importable in Blender: File → Import → glTF 2.0). */
function Exporter() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    window.__MX_GLB__ = async () => {
      const root = scene.getObjectByName('Kettle') ?? scene;
      const clone = root.clone(true);
      // drop helpers that glTF cannot represent meaningfully (x-ray ghosts, lights)
      const remove: THREE.Object3D[] = [];
      clone.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (mat && (mat as THREE.ShaderMaterial).isShaderMaterial) remove.push(o);
        if ((o as THREE.Light).isLight) remove.push(o);
      });
      remove.forEach((o) => o.removeFromParent());
      clone.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) {
          const c = m.clone();
          c.clippingPlanes = null;
          (o as THREE.Mesh).material = c;
        }
      });
      const result = (await new GLTFExporter().parseAsync(clone, { binary: true })) as ArrayBuffer;
      let bin = '';
      const bytes = new Uint8Array(result);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
  }, [scene]);
  return null;
}

export function GLBExport({ project }: { project: ExplainerProject }) {
  const { Model } = project;
  if (!Model) return <div>Project has no exportable Model</div>;
  return (
    <div style={{ width: 512, height: 512 }}>
      <Canvas frameloop="demand" gl={{ preserveDrawingBuffer: true }}>
        <Model />
        <Exporter />
      </Canvas>
    </div>
  );
}
