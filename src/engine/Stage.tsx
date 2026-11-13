import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraRig } from './components/CameraRig';
import { RenderBridge } from './components/RenderBridge';
import { VIDEO } from './config';
import type { ExplainerProject } from './project';
import { useTime } from './time';

export type StageMode = 'preview' | 'render';

/** Fixed 1080×1920 stage. Preview scales it with CSS; render captures it 1:1. */
export function Stage({ project, mode, scale = 1 }: { project: ExplainerProject; mode: StageMode; scale?: number }) {
  const { Scene, Overlay, camera, timeline, post } = project;
  return (
    <div
      className="mx-stage"
      id="mx-stage"
      style={{ width: VIDEO.width, height: VIDEO.height, transform: scale !== 1 ? `scale(${scale})` : undefined }}
    >
      <Canvas
        frameloop={mode === 'render' ? 'never' : 'always'}
        dpr={1}
        shadows="soft"
        resize={{ offsetSize: true }}
        camera={{ fov: 32, near: 0.05, far: 60, position: [0, 2, 8] }}
        gl={{ antialias: false, preserveDrawingBuffer: mode === 'render', powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <CameraRig path={camera} frameOffsetY={project.frameOffsetY} />
        <Suspense fallback={null}>
          <Scene />
          {mode === 'render' && <RenderBridge timeline={timeline} />}
        </Suspense>
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={post?.bloom ?? 0.9} luminanceThreshold={post?.bloomThreshold ?? 1.0} luminanceSmoothing={0.2} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.AGX} />
          <Vignette offset={0.25} darkness={post?.vignette ?? 0.55} />
          <SMAA />
        </EffectComposer>
      </Canvas>
      {Overlay && (
        <div className="mx-overlay">
          <Overlay />
        </div>
      )}
      {mode === 'preview' && <PreviewClock duration={timeline.duration} />}
    </div>
  );
}

/** Real-time playback for the browser preview (the exporter never uses this). */
function PreviewClock({ duration }: { duration: number }) {
  const last = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const s = useTime.getState();
      if (s.playing && last.current !== null) {
        let t = s.time + (now - last.current) / 1000;
        if (t >= duration) t = 0;
        s.setTime(t);
      }
      last.current = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return null;
}
