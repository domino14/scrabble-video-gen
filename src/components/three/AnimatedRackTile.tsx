// AnimatedRackTile - Rack tile component with fly-off animation
// Handles three states: static, animating (flying off), and hidden

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Tile } from './Tile';
import { getSpringProgress } from '../../lib/animation-utils';
import { getRackPosition, getRackTileRotation } from '../../lib/board-coordinates';

interface AnimatedRackTileProps {
  letter: string;
  value: number;
  rackIndex: number;
  animationState?: {
    startFrame: number;
    playIndex: number;
    speed: number;
  };
  isPlayer1: boolean; // Determines fly-off direction
  tileColor?: string;
}

const TILE_STAGGER = 8; // frames between tiles (at speed 1.0)
const FLY_OFF_DURATION = 20; // frames for rack fly-off animation

export const AnimatedRackTile: React.FC<AnimatedRackTileProps> = ({
  letter,
  value,
  rackIndex,
  animationState,
  isPlayer1,
  tileColor = 'orange',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rackPos = getRackPosition(rackIndex);
  const theta = getRackTileRotation();

  const isBlank =
    letter === '?' ||
    (letter === letter.toLowerCase() && letter !== letter.toUpperCase());

  // No animation - render statically
  if (!animationState) {
    return (
      <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation-x={theta}>
        <Tile
          letter={letter}
          value={value}
          position={[0, 0, 0]}
          color={tileColor}
          blank={isBlank}
        />
      </group>
    );
  }

  // Calculate animation progress
  const { startFrame, playIndex, speed } = animationState;
  const adjustedStagger = TILE_STAGGER / speed;
  const delay = playIndex * adjustedStagger;
  const animFrame = frame - startFrame - delay;

  // Not yet animating - show static tile
  if (animFrame < 0) {
    return (
      <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation-x={theta}>
        <Tile
          letter={letter}
          value={value}
          position={[0, 0, 0]}
          color={tileColor}
          blank={isBlank}
        />
      </group>
    );
  }

  // Animation complete - hide tile
  if (animFrame > FLY_OFF_DURATION) {
    return null;
  }

  // Interpolate position: rack → off-screen (up + toward center)
  const scaledAnimFrame = animFrame * speed;
  const progress = getSpringProgress(scaledAnimFrame, fps, 0);
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Exit trajectory: up (+Y) and toward center (±X depending on player)
  const exitX = isPlayer1 ? rackPos.x + 30 : rackPos.x - 30; // Toward center
  const exitY = rackPos.y + 50; // Up
  const exitZ = rackPos.z + 15; // Lift up

  const x = interpolate(clampedProgress, [0, 1], [rackPos.x, exitX]);
  const y = interpolate(clampedProgress, [0, 1], [rackPos.y, exitY]);
  const z = interpolate(clampedProgress, [0, 1], [rackPos.z, exitZ]);

  // Maintain rack tilt during flight, add slight rotation
  const rotationZ = interpolate(clampedProgress, [0, 1], [0, Math.PI * 0.2]);

  return (
    <group position={[x, y, z]} rotation={[theta, 0, rotationZ]}>
      <Tile
        letter={letter}
        value={value}
        position={[0, 0, 0]}
        color={tileColor}
        blank={isBlank}
      />
    </group>
  );
};
