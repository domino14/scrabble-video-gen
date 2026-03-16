// AnimatedRackTile - Rack tile component with fly-off, fly-in, and swap animations

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Tile } from './Tile';
import { getSpringProgress } from '../../lib/animation-utils';
import { getRackPosition, getRackTileRotation } from '../../lib/board-coordinates';
import { DRAW_STAGGER, DRAW_FLY_DURATION, SWAP_DURATION } from '../../lib/rack-animation-utils';

interface AnimatedRackTileProps {
  letter: string;
  value: number;
  rackIndex: number;
  animationState?: {
    type?: 'flyOff' | 'flyIn' | 'swap'; // undefined = flyOff (backward compat)
    startFrame: number;
    playIndex: number; // stagger index (for flyOff/flyIn) or stepIndex (for swap)
    speed: number;
    targetRackIndex?: number; // for swap: destination slot
  };
  isPlayer1: boolean;
  tileColor?: string;
}

const TILE_STAGGER = 8; // frames between tiles for flyOff (at speed 1.0)
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
      <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation={[theta, 0, 0]}>
        <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
      </group>
    );
  }

  const { type = 'flyOff', startFrame, playIndex, speed, targetRackIndex } = animationState;

  // ─── FLY-OFF (existing behavior) ───────────────────────────────────────────
  if (type === 'flyOff') {
    const adjustedStagger = TILE_STAGGER / speed;
    const delay = playIndex * adjustedStagger;
    const animFrame = frame - startFrame - delay;

    if (animFrame < 0) {
      return (
        <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation={[theta, 0, 0]}>
          <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
        </group>
      );
    }
    if (animFrame > FLY_OFF_DURATION) return null;

    const scaledAnimFrame = animFrame * speed;
    const progress = getSpringProgress(scaledAnimFrame, fps, 0);
    const p = Math.max(0, Math.min(1, progress));

    const exitX = isPlayer1 ? rackPos.x + 30 : rackPos.x - 30;
    const exitY = rackPos.y + 50;
    const exitZ = rackPos.z + 15;

    const x = interpolate(p, [0, 1], [rackPos.x, exitX]);
    const y = interpolate(p, [0, 1], [rackPos.y, exitY]);
    const z = interpolate(p, [0, 1], [rackPos.z, exitZ]);
    const rotationY = interpolate(p, [0, 1], [0, Math.PI * 2]);

    return (
      <group position={[x, y, z]} rotation={[theta, rotationY, 0]}>
        <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
      </group>
    );
  }

  // ─── FLY-IN ────────────────────────────────────────────────────────────────
  if (type === 'flyIn') {
    const adjustedStagger = DRAW_STAGGER / speed;
    const adjustedDuration = DRAW_FLY_DURATION / speed;
    const delay = playIndex * adjustedStagger;
    const animFrame = frame - startFrame - delay;

    // Not yet started: invisible (tile hasn't arrived)
    if (animFrame < 0) return null;

    // Finished: show statically at rack position
    if (animFrame > adjustedDuration) {
      return (
        <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation={[theta, 0, 0]}>
          <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
        </group>
      );
    }

    // Flying in: from above toward rack position
    const scaledAnimFrame = animFrame * speed;
    const progress = getSpringProgress(scaledAnimFrame, fps, 0);
    const p = Math.max(0, Math.min(1, progress));

    // Start high above the rack slot, drop down
    const startX = rackPos.x;
    const startY = rackPos.y + 45;
    const startZ = rackPos.z + 18;

    const x = interpolate(p, [0, 1], [startX, rackPos.x]);
    const y = interpolate(p, [0, 1], [startY, rackPos.y]);
    const z = interpolate(p, [0, 1], [startZ, rackPos.z]);
    const rotationY = interpolate(p, [0, 1], [Math.PI * 2, 0]); // reverse spin

    return (
      <group position={[x, y, z]} rotation={[theta, rotationY, 0]}>
        <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
      </group>
    );
  }

  // ─── SWAP ──────────────────────────────────────────────────────────────────
  if (type === 'swap' && targetRackIndex !== undefined) {
    const adjustedDuration = SWAP_DURATION / speed;
    const delay = playIndex * adjustedDuration; // sequential: each swap waits for previous
    const animFrame = frame - startFrame - delay;
    const targetPos = getRackPosition(targetRackIndex);

    // Not yet started: show at source position
    if (animFrame < 0) {
      return (
        <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation={[theta, 0, 0]}>
          <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
        </group>
      );
    }

    // Finished: show at target position
    if (animFrame > adjustedDuration) {
      return (
        <group position={[targetPos.x, targetPos.y, targetPos.z]} rotation={[theta, 0, 0]}>
          <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
        </group>
      );
    }

    // Sliding: spring from source to target (horizontal slide only)
    const scaledAnimFrame = animFrame * speed;
    const progress = getSpringProgress(scaledAnimFrame, fps, 0);
    const p = Math.max(0, Math.min(1, progress));

    const x = interpolate(p, [0, 1], [rackPos.x, targetPos.x]);
    const y = interpolate(p, [0, 1], [rackPos.y, targetPos.y]);
    const z = interpolate(p, [0, 1], [rackPos.z, targetPos.z]);

    return (
      <group position={[x, y, z]} rotation={[theta, 0, 0]}>
        <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
      </group>
    );
  }

  // Fallback: render statically
  return (
    <group position={[rackPos.x, rackPos.y, rackPos.z]} rotation={[theta, 0, 0]}>
      <Tile letter={letter} value={value} position={[0, 0, 0]} color={tileColor} blank={isBlank} />
    </group>
  );
};
