// Animated score widget for broadcast mode
// Large, animated count-up score display

import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { PlayerData } from '../../types/board-3d-data';

interface BroadcastScoreWidgetProps {
  player: PlayerData;
  position: 'left' | 'right';
}

export const BroadcastScoreWidget: React.FC<BroadcastScoreWidgetProps> = ({
  player,
  position,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Track score changes to restart animation
  const scoreHistory = useMemo(() => {
    const history: Array<{ score: number; frame: number }> = [{ score: 0, frame: 0 }];
    return history;
  }, []);

  // Find the most recent score change
  const { previousScore, changeFrame } = useMemo(() => {
    const lastRecorded = scoreHistory[scoreHistory.length - 1];
    if (player.score !== lastRecorded.score) {
      scoreHistory.push({ score: player.score, frame });
    }

    const prev = scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 2].score : 0;
    const changeF = scoreHistory[scoreHistory.length - 1].frame;

    return { previousScore: prev, changeFrame: changeF };
  }, [player.score, frame, scoreHistory]);

  // Delay before score animation starts
  const SCORE_ANIMATION_DELAY = 30; // frames

  // Animate from previous score to current score
  const animationProgress = spring({
    frame: Math.max(0, frame - changeFrame - SCORE_ANIMATION_DELAY),
    fps,
    config: {
      damping: 15,
      stiffness: 60,
    },
  });

  // Show previous score during delay, then animate
  const isDelayed = frame - changeFrame < SCORE_ANIMATION_DELAY;
  const displayScore = isDelayed
    ? previousScore
    : Math.round(previousScore + (player.score - previousScore) * animationProgress);

  const isLeft = position === 'left';

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: '265px', // Above the rack widget (170px rack + 55px label + 40px margin)
          [isLeft ? 'left' : 'right']: '40px',
          width: '480px',
        }}
      >
        <div
          style={{
            backgroundColor: player.onturn
              ? 'rgba(76, 175, 80, 0.9)'
              : 'rgba(30, 30, 30, 0.9)',
            border: '3px solid ' + (player.onturn ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)'),
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s',
          }}
        >
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              color: '#FFD700',
              fontSize: '72px',
              fontWeight: 'bold',
              textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)',
              letterSpacing: '2px',
            }}
          >
            {displayScore}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
