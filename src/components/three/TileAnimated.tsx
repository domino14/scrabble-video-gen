// Animated tile component with rack-to-board animation

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Tile } from './Tile';
import { getSpringProgress, createArcTrajectory, getStaggerDelay } from '../../lib/animation-utils';
import * as THREE from 'three';

interface TileAnimatedProps {
  letter: string;
  value: number;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  color?: string;
  blank?: boolean;
  startFrame: number;
  index?: number; // For staggered animation
  speed?: number; // Animation speed multiplier (default 1.0, lower = slower)
}

const TILE_FLIGHT_DURATION = 30; // frames
const TILE_STAGGER = 8; // frames between tiles (at speed 1.0)

export const TileAnimated: React.FC<TileAnimatedProps> = ({
  letter,
  value,
  startPosition,
  endPosition,
  color = 'orange',
  blank = false,
  startFrame,
  index = 0,
  speed = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate staggered delay with speed multiplier
  // Lower speed = more frames between tiles
  const adjustedStagger = TILE_STAGGER / speed;
  const delay = getStaggerDelay(index, adjustedStagger);
  const animationFrame = frame - startFrame - delay;

  // Spring animation progress with speed adjustment
  // Scale the animation frame by speed to make it slower/faster
  const scaledAnimationFrame = animationFrame * speed;
  const progress = getSpringProgress(scaledAnimationFrame, fps, 0);

  // Clamp progress to 0-1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Interpolate position
  const x = interpolate(clampedProgress, [0, 1], [startPosition[0], endPosition[0]]);
  const y = interpolate(clampedProgress, [0, 1], [startPosition[1], endPosition[1]]);

  // Arc trajectory for z position
  const baseZ = interpolate(clampedProgress, [0, 1], [startPosition[2], endPosition[2]]);
  const arcHeight = createArcTrajectory(clampedProgress, 15);
  const z = baseZ + arcHeight;

  // Rack tilt angle (from liwords)
  const rackHeight = 3;
  const rackDepth = 7;
  const height2 = rackHeight * 0.3;
  const depth3 = 0.8 * rackDepth;
  const depth2 = 0.4 * rackDepth;
  const radius1 = 0.015 * rackDepth;
  const slope = (rackHeight - radius1 - height2) / (depth2 + radius1 - depth3);
  const rackTiltAngle = -Math.atan(slope);

  // Rotation during flight: start tilted (rack angle), end flat
  const rotationX = interpolate(clampedProgress, [0, 1], [rackTiltAngle, 0]);
  const rotationZ = interpolate(
    clampedProgress,
    [0, 0.5, 1],
    [0, Math.PI * 0.5, 0]
  );

  // Only show tile if animation has started
  if (animationFrame < 0) {
    return null;
  }

  return (
    <group position={[x, y, z]} rotation={[rotationX, 0, rotationZ]}>
      <Tile
        letter={letter}
        value={value}
        position={[0, 0, 0]}
        color={color}
        blank={blank}
      />
    </group>
  );
};
