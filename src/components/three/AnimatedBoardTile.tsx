// AnimatedBoardTile - Unified tile component with integrated animation
// Wraps <Tile> with animation logic when animationSource is present

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Tile } from './Tile';
import { getSpringProgress, createArcTrajectory } from '../../lib/animation-utils';
import { TileData } from '../../types/board-3d-data';
import { getBoardPosition, getRackPosition, getRackTileRotation } from '../../lib/board-coordinates';

interface AnimatedBoardTileProps {
  tile: TileData;
  tileColor?: string;
}

const TILE_STAGGER = 8; // frames between tiles (at speed 1.0)

export const AnimatedBoardTile: React.FC<AnimatedBoardTileProps> = ({
  tile,
  tileColor = 'orange',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const endPos = getBoardPosition(tile.row, tile.col);

  // If no animation source, render statically at board position
  // Keep using group wrapper for consistent structure
  if (!tile.animationSource) {
    return (
      <group position={[endPos.x, endPos.y, endPos.z]} rotation={[0, 0, 0]}>
        <Tile
          letter={tile.letter}
          value={tile.value}
          position={[0, 0, 0]}
          color={tileColor}
          blank={tile.blank}
        />
      </group>
    );
  }

  // Animation in progress - calculate interpolated position
  const { rackIndex, animationStartFrame, playIndex, speed } = tile.animationSource;

  // Calculate staggered delay with speed multiplier
  const adjustedStagger = TILE_STAGGER / speed;
  const delay = playIndex * adjustedStagger;
  const animationFrame = frame - animationStartFrame - delay;

  // Only show tile if animation has started (before that, rack tile is visible)
  if (animationFrame < 0) {
    return null;
  }

  // Spring animation progress with speed adjustment
  const scaledAnimationFrame = animationFrame * speed;
  const progress = getSpringProgress(scaledAnimationFrame, fps, 0);

  // Clamp progress to 0-1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Get start position
  const startPos = getRackPosition(rackIndex);

  // Interpolate position
  const x = interpolate(clampedProgress, [0, 1], [startPos.x, endPos.x]);
  const y = interpolate(clampedProgress, [0, 1], [startPos.y, endPos.y]);

  // Arc trajectory for z position
  const baseZ = interpolate(clampedProgress, [0, 1], [startPos.z, endPos.z]);
  const arcHeight = createArcTrajectory(clampedProgress, 15);
  const z = baseZ + arcHeight;

  // Rotation during flight: start tilted (rack angle), end flat, with flashy vertical spin
  const rackTiltAngle = getRackTileRotation();
  const rotationX = interpolate(clampedProgress, [0, 1], [rackTiltAngle, 0]);
  const rotationY = interpolate(clampedProgress, [0, 1], [0, Math.PI * 2]); // Full 360° spin

  return (
    <group position={[x, y, z]} rotation={[rotationX, rotationY, 0]}>
      <Tile
        letter={tile.letter}
        value={tile.value}
        position={[0, 0, 0]}
        color={tileColor}
        blank={tile.blank}
      />
    </group>
  );
};
