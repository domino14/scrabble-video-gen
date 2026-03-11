// Tile glow effect for highlighting

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { pulse } from '../../lib/animation-utils';

interface TileGlowProps {
  position: [number, number, number];
  size?: number;
  color?: string;
  intensity?: number;
}

export const TileGlow: React.FC<TileGlowProps> = ({
  position,
  size = 6,
  color = '#FFD700',
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pulsing opacity
  const opacity = pulse(frame, fps, 1) * 0.5 + 0.5; // 0.5 to 1.0

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity * intensity}
        depthWrite={false}
      />
    </mesh>
  );
};
