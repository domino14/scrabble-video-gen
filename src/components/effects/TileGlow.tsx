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

  // Pulsing opacity - much stronger pulse
  const opacity = pulse(frame, fps, 2) * 0.4 + 0.6; // 0.6 to 1.0, faster pulse

  return (
    <>
      {/* Main bright glow */}
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * intensity}
          depthWrite={false}
        />
      </mesh>
      {/* Outer glow ring for more visibility */}
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 1.5, size * 1.5]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * intensity * 0.5}
          depthWrite={false}
        />
      </mesh>
    </>
  );
};
