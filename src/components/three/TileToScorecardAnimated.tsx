// Animated tile component for end-game rack penalty - flies from rack to opponent's scorecard

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Tile } from './Tile';
import { getSpringProgress } from '../../lib/animation-utils';
import { SQUARE_SIZE, BOARD_SIZE, BOARD_HEIGHT } from '../../lib/board-coordinates';

interface TileToScorecardAnimatedProps {
  letter: string;
  value: number;
  startPosition: [number, number, number];
  targetPlayerIndex: number; // Which player's scorecard to fly to (0 or 1)
  color?: string;
  blank?: boolean;
  startFrame: number;
  index?: number; // For staggered animation
  speed?: number; // Animation speed multiplier
}

const TILE_STAGGER = 8; // frames between tiles (at speed 1.0)

export const TileToScorecardAnimated: React.FC<TileToScorecardAnimatedProps> = ({
  letter,
  value,
  startPosition,
  targetPlayerIndex,
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

  // Clamp progress to 0-1, but allow slight negative start for smooth overlap
  const clampedProgress = Math.max(-0.01, Math.min(1, progress));

  // Target position: fly towards the left side where scorecard is
  // Use board coordinate system for consistency
  const targetRow = 10; // Mid-height on board
  const targetCol = -8; // 8 columns to the left (clearly off-board towards scorecard)

  // Calculate using same logic as getBoardPosition
  const gridSize = BOARD_SIZE;
  const offset = (gridSize * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;
  const targetX = targetCol * SQUARE_SIZE - offset - SQUARE_SIZE / 2 + 0.375;
  const targetY = (gridSize - 1 - targetRow) * SQUARE_SIZE - offset - SQUARE_SIZE / 2 + 0.125;
  const targetZ = 0; // Same height as rack/board area

  // Fly from rack to scorecard with gentle arc
  const x = interpolate(clampedProgress, [0, 1], [startPosition[0], targetX]);
  const y = interpolate(clampedProgress, [0, 1], [startPosition[1], targetY]);
  const z = interpolate(
    clampedProgress,
    [0, 0.4, 1],
    [startPosition[2], startPosition[2] + 20, targetZ] // Arc up higher, then swoop down
  );

  // Start with rack tilt angle, then tumble during flight
  // Rack tilt calculation (from liwords)
  const rackHeight = 3;
  const rackDepth = 7;
  const height2 = rackHeight * 0.3;
  const depth3 = 0.8 * rackDepth;
  const depth2 = 0.4 * rackDepth;
  const radius1 = 0.015 * rackDepth;
  const slope = (rackHeight - radius1 - height2) / (depth2 + radius1 - depth3);
  const rackTiltAngle = -Math.atan(slope);

  // Rotate from rack tilt to tumbling
  const rotationX = interpolate(clampedProgress, [0, 0.2, 1], [rackTiltAngle, 0, Math.PI * 2]);
  const rotationZ = interpolate(clampedProgress, [0, 1], [0, Math.PI]);

  // Fade out and shrink as it reaches the scorecard
  const opacity = interpolate(clampedProgress, [0, 0.8, 1], [1, 1, 0]);
  const scale = interpolate(clampedProgress, [0, 0.8, 1], [1, 1, 0.3]);

  // Show tile slightly before animation starts to ensure smooth overlap with rack tile
  const APPEAR_BUFFER = 5; // frames early appearance
  if (animationFrame < -APPEAR_BUFFER) {
    return null;
  }

  // Hide after animation completes
  if (clampedProgress >= 1) {
    return null;
  }

  return (
    <group position={[x, y, z]} rotation={[rotationX, 0, rotationZ]} scale={scale}>
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
