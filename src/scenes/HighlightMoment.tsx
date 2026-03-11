// Extended highlight scene for analysis

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { Board3DData } from '../types/board-3d-data';

interface HighlightMomentProps {
  boardState: Board3DData;
  analysis?: {
    mistakeSize?: number;
    optimalMove?: string;
    optimalScore?: number;
    explanation?: string;
  };
}

export const HighlightMoment: React.FC<HighlightMomentProps> = ({
  boardState,
  analysis,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate entry
  const opacity = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  if (!analysis) return null;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: '120px',
          right: '40px',
          width: '400px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            padding: '20px',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderRadius: '12px',
            border: '2px solid #FFD700',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#FFD700',
              marginBottom: '15px',
            }}
          >
            Analysis
          </div>

          {analysis.mistakeSize !== undefined && (
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '16px', color: '#aaa' }}>
                Equity Lost:
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: analysis.mistakeSize > 10 ? '#ff4444' : '#ffaa44',
                  marginLeft: '10px',
                }}
              >
                {analysis.mistakeSize.toFixed(1)}
              </span>
            </div>
          )}

          {analysis.optimalMove && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '16px', color: '#aaa', marginBottom: '5px' }}>
                Best Move:
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#4CAF50',
                }}
              >
                {analysis.optimalMove}
                {analysis.optimalScore && (
                  <span style={{ fontSize: '18px', marginLeft: '10px' }}>
                    ({analysis.optimalScore} pts)
                  </span>
                )}
              </div>
            </div>
          )}

          {analysis.explanation && (
            <div
              style={{
                fontSize: '14px',
                color: '#ccc',
                marginTop: '15px',
                lineHeight: '1.5',
              }}
            >
              {analysis.explanation}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
