// Camera controller with keyframe-based animation
// Using Remotion's declarative approach (not useFrame)

import React, { useRef, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import * as THREE from 'three';
import { PerspectiveCamera } from '@react-three/drei';

export interface CameraKeyframe {
  frame: number;
  position: [number, number, number];
  lookAt: [number, number, number];
  linear?: boolean; // If true, use linear interpolation instead of easing
}

interface CameraControllerProps {
  keyframes: CameraKeyframe[];
}

export const CameraController: React.FC<CameraControllerProps> = ({ keyframes }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lookAtTargetRef = useRef(new THREE.Vector3());

  // Find the two keyframes to interpolate between
  const getCurrentKeyframes = (): [CameraKeyframe, CameraKeyframe] => {
    if (keyframes.length === 0) {
      // Default keyframes if none provided
      return [
        {
          frame: 0,
          position: [0, -50, 130],
          lookAt: [0, -10, 0],
        },
        {
          frame: 1000,
          position: [0, -50, 130],
          lookAt: [0, -10, 0],
        },
      ];
    }

    if (keyframes.length === 1) {
      return [keyframes[0], keyframes[0]];
    }

    // Find keyframes before and after current frame
    let beforeIndex = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].frame <= frame && keyframes[i + 1].frame > frame) {
        beforeIndex = i;
        break;
      }
      if (frame >= keyframes[keyframes.length - 1].frame) {
        beforeIndex = keyframes.length - 2;
      }
    }

    return [keyframes[beforeIndex], keyframes[beforeIndex + 1]];
  };

  const [keyframe1, keyframe2] = getCurrentKeyframes();

  // Use linear interpolation if either keyframe requests it, otherwise use smooth easing
  const useLinear = keyframe1.linear || keyframe2.linear;
  const progress = interpolate(
    frame,
    [keyframe1.frame, keyframe2.frame],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: useLinear
        ? (t) => t  // Linear - constant speed
        : (t) => {  // Smooth ease-in-out
            return t < 0.5
              ? 4 * t * t * t
              : 1 - Math.pow(-2 * t + 2, 3) / 2;
          }
    }
  );

  // Calculate target position and lookAt (declarative, based on frame)
  const targetPosition = useMemo(() => ({
    x: interpolate(progress, [0, 1], [keyframe1.position[0], keyframe2.position[0]]),
    y: interpolate(progress, [0, 1], [keyframe1.position[1], keyframe2.position[1]]),
    z: interpolate(progress, [0, 1], [keyframe1.position[2], keyframe2.position[2]]),
  }), [progress, keyframe1.position, keyframe2.position]);

  const targetLookAt = useMemo(() => ({
    x: interpolate(progress, [0, 1], [keyframe1.lookAt[0], keyframe2.lookAt[0]]),
    y: interpolate(progress, [0, 1], [keyframe1.lookAt[1], keyframe2.lookAt[1]]),
    z: interpolate(progress, [0, 1], [keyframe1.lookAt[2], keyframe2.lookAt[2]]),
  }), [progress, keyframe1.lookAt, keyframe2.lookAt]);

  // Update lookAt (position is handled by PerspectiveCamera prop)
  React.useLayoutEffect(() => {
    if (cameraRef.current) {
      lookAtTargetRef.current.set(targetLookAt.x, targetLookAt.y, targetLookAt.z);
      cameraRef.current.lookAt(lookAtTargetRef.current);
    }
  }, [targetLookAt.x, targetLookAt.y, targetLookAt.z]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={50}
      near={0.1}
      far={1000}
      position={[targetPosition.x, targetPosition.y, targetPosition.z]}
    />
  );
};
