import { Environment, Lightformer } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { getRadialFadeTexture, getStoneTexture } from '../effects/textures';

/**
 * Fully procedural photo studio: softbox reflections via Lightformers (no HDRI download),
 * shadow-casting key light, cool rim lights and a glossy floor fading into the dark background.
 */
export interface StudioProps {
  background?: string;
  floorColor?: string;
  /** 'floor' = glossy studio floor (kettle), 'counter' = dark stone kitchen countertop */
  surface?: 'floor' | 'counter';
  /** half-extent of the key light's shadow frustum */
  shadowExtent?: [left: number, right: number, top: number, bottom: number];
  /** fog start/end — larger appliances need the camera further away */
  fog?: [near: number, far: number];
  /** countertop size [width, depth] and z centre */
  counter?: { size: [number, number]; z: number };
}

export function Studio({ background = '#06070a', floorColor = '#0d0f13', surface = 'floor', shadowExtent = [-3, 3, 4, -2], fog = [14, 30], counter }: StudioProps) {
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
      <fog attach="fog" args={[background, fog[0], fog[1]]} />
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
        shadow-camera-left={shadowExtent[0]}
        shadow-camera-right={shadowExtent[1]}
        shadow-camera-top={shadowExtent[2]}
        shadow-camera-bottom={shadowExtent[3]}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <spotLight position={[-5, 4, -4]} intensity={30} angle={0.5} penumbra={0.8} color="#7fb8ff" />
      <spotLight position={[5, 3, -5]} intensity={30} angle={0.5} penumbra={0.9} color="#ffd1a3" />
      {surface === 'floor' ? (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow material={floorMat}>
          <circleGeometry args={[9, 96]} />
        </mesh>
      ) : (
        <Countertop {...counter} />
      )}
    </>
  );
}

/** Dark speckled stone worktop (procedural texture), front edge visible, fades into the dark studio. */
function Countertop({ size = [30, 22], z = 2 }: { size?: [number, number]; z?: number }) {
  const mats = useMemo(() => {
    const map = getStoneTexture();
    const top = new THREE.MeshPhysicalMaterial({ color: '#2a2c31', map, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25, metalness: 0.05 });
    const edge = new THREE.MeshStandardMaterial({ color: '#16171a', map, roughness: 0.4 });
    return [edge, edge, top, edge, edge, edge];
  }, []);
  return (
    <mesh position={[0, -0.3, z]} receiveShadow material={mats}>
      {/* subdivided: huge triangles reaching behind the camera get mis-clipped by software WebGL (SwiftShader) */}
      <boxGeometry args={[size[0], 0.6, size[1], 24, 1, 18]} />
    </mesh>
  );
}
