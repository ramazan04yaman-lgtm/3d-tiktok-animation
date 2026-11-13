import { Environment, Lightformer } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { getRadialFadeTexture } from '../effects/textures';

/**
 * Fully procedural photo studio: softbox reflections via Lightformers (no HDRI download),
 * shadow-casting key light, cool rim lights and a glossy floor fading into the dark background.
 */
export function Studio({ background = '#06070a', floorColor = '#0d0f13' }: { background?: string; floorColor?: string }) {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: 0.55,
        metalness: 0.1,
        transparent: true,
        alphaMap: getRadialFadeTexture(),
      }),
    [floorColor],
  );
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 14, 30]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-6, 2, 1]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[6, 2.5, -1]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} color="#cfe6ff" />
        <Lightformer form="ring" intensity={1.2} position={[0, 3, -7]} scale={4} color="#9fd0ff" />
        <Lightformer form="rect" intensity={0.6} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#22262e" />
      </Environment>
      <ambientLight intensity={0.08} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <spotLight position={[-5, 4, -4]} intensity={30} angle={0.5} penumbra={0.8} color="#7fb8ff" />
      <spotLight position={[5, 3, -5]} intensity={30} angle={0.5} penumbra={0.9} color="#ffd1a3" />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow material={floorMat}>
        <circleGeometry args={[9, 96]} />
      </mesh>
    </>
  );
}
