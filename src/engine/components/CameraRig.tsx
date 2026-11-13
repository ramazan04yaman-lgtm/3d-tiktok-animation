import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { CameraPath } from '../camera';
import { getTime, useTimelineFrame } from '../time';

/** Drives the default camera from a CameraPath. Runs before every other frame callback. */
export function CameraRig({ path, frameOffsetY = 0 }: { path: CameraPath; frameOffsetY?: number }) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const apply = (t: number) => {
    const s = path.sample(t);
    camera.position.set(...s.position);
    camera.lookAt(...s.target);
    // frameOffsetY > 0 moves the subject up on screen (keeps room for captions below)
    const off = camera.view;
    if (Math.abs(camera.fov - s.fov) > 1e-6 || (frameOffsetY && (!off || off.offsetY !== frameOffsetY || off.fullWidth !== size.width))) {
      camera.fov = s.fov;
      if (frameOffsetY) camera.setViewOffset(size.width, size.height, 0, frameOffsetY, size.width, size.height);
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  };
  useLayoutEffect(() => apply(getTime()));
  useTimelineFrame((t) => apply(t), -100);
  return null;
}
