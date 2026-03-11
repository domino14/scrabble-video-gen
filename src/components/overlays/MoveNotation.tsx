// Move notation overlay component

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface MoveNotationProps {
  notation?: string;
  isBingo?: boolean;
  score?: number;
  startFrame: number;
}

export const MoveNotation: React.FC<MoveNotationProps> = ({
  notation,
  isBingo = false,
  score,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!notation) return null;

  // Animate entry
  const animationFrame = frame - startFrame;
  const opacity = spring({
    frame: animationFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const scale = spring({
    frame: animationFrame,
    fps,
    from: 0.5,
    to: 1,
    config: {
      damping: 15,
      stiffness: 150,
    },
  });

  // Bingo flash animation
  const bingoFlash = isBingo
    ? interpolate(
        animationFrame % 30,
        [0, 15, 30],
        [1, 1.2, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 1;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: animationFrame < 0 ? 0 : opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: `translate(-50%, 0) scale(${scale})`,
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '15px 30px',
            backgroundColor: isBingo
              ? 'rgba(255, 215, 0, 0.9)'
              : 'rgba(50, 50, 50, 0.8)',
            borderRadius: '12px',
            border: isBingo ? '3px solid #FFD700' : '2px solid #666',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
            transform: `scale(${bingoFlash})`,
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: isBingo ? '#000' : 'white',
              marginBottom: '5px',
            }}
          >
            {notation}
          </div>
          {score !== undefined && (
            <div
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: isBingo ? '#8B0000' : '#FFD700',
              }}
            >
              {score} points
            </div>
          )}
          {isBingo && (
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#8B0000',
                marginTop: '5px',
              }}
            >
              ⭐ BINGO! ⭐
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
