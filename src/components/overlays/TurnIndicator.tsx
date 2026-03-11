// Turn indicator overlay component

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';

interface TurnIndicatorProps {
  turnNumber: number;
  totalTurns?: number;
  startFrame: number;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  turnNumber,
  totalTurns,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animationFrame = frame - startFrame;

  // Fade in/out animation
  const opacity = spring({
    frame: animationFrame,
    fps,
    config: {
      damping: 25,
      stiffness: 120,
    },
  });

  // Auto-fade out after 2 seconds
  const fadeOut = animationFrame > fps * 2
    ? Math.max(0, 1 - (animationFrame - fps * 2) / 30)
    : 1;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: animationFrame < 0 ? 0 : opacity * fadeOut,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'right',
        }}
      >
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(50, 50, 50, 0.8)',
            borderRadius: '8px',
            border: '2px solid #666',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              color: '#aaa',
              marginBottom: '5px',
            }}
          >
            Turn
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            {turnNumber}
            {totalTurns && (
              <span style={{ fontSize: '20px', color: '#888' }}>
                {' '}/ {totalTurns}
              </span>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
