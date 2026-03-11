// Animated tile component for exchange - flies away from rack towards camera

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Tile } from './Tile';
import { getSpringProgress } from '../../lib/animation-utils';

interface TileExchangeAnimatedProps {
  letter: string;
  value: number;
  startPosition: [number, number, number];
  color?: string;
  blank?: boolean;
  startFrame: number;
  index?: number; // For staggered animation
  speed?: number; // Animation speed multiplier
}

const TILE_STAGGER = 8; // frames between tiles (at speed 1.0)

export const TileExchangeAnimated: React.FC<TileExchangeAnimatedProps> = ({
  letter,
  value,
  startPosition,
  color = 'orange',
  blank = false,
  startFrame,
  index = 0,
  speed = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate staggered delay with speed multiplier
  const adjustedStagger = TILE_STAGGER / speed;
  const delay = index * adjustedStagger;
  const animationFrame = frame - startFrame - delay;

  // Spring animation progress with speed adjustment
  const scaledAnimationFrame = animationFrame * speed;
  const progress = getSpringProgress(scaledAnimationFrame, fps, 0);

  // Clamp progress to 0-1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Fly away from rack towards camera (increasing Z)
  const x = interpolate(
    clampedProgress,
    [0, 1],
    [startPosition[0], startPosition[0] + (Math.random() - 0.5) * 30] // Random horizontal drift
  );
  const y = interpolate(
    clampedProgress,
    [0, 1],
    [startPosition[1], startPosition[1] - 20] // Move towards camera (negative Y)
  );
  const z = interpolate(
    clampedProgress,
    [0, 1],
    [startPosition[2], startPosition[2] + 100] // Fly upward dramatically
  );

  // Rotation during flight - tumbling effect
  const rotationX = interpolate(clampedProgress, [0, 1], [0, Math.PI * 4]);
  const rotationY = interpolate(clampedProgress, [0, 1], [0, Math.PI * 3]);
  const rotationZ = interpolate(clampedProgress, [0, 1], [0, Math.PI * 2]);

  // Fade out as it flies away
  const opacity = interpolate(clampedProgress, [0, 0.7, 1], [1, 0.7, 0]);

  // Only show tile if animation has started
  if (animationFrame < 0) {
    return null;
  }

  // Hide after animation completes
  if (clampedProgress >= 1) {
    return null;
  }

  return (
    <group position={[x, y, z]} rotation={[rotationX, rotationY, rotationZ]}>
      <group scale={opacity}>
        <Tile
          letter={letter}
          value={value}
          position={[0, 0, 0]}
          color={color}
          blank={blank}
        />
      </group>
    </group>
  );
};
