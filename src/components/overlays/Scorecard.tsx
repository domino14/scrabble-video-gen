// Scorecard overlay component

import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { PlayerData } from '../../types/board-3d-data';

interface ScorecardProps {
  players: PlayerData[];
}

export const Scorecard: React.FC<ScorecardProps> = ({ players }) => {
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
          bottom: '40px',
          left: '40px',
          fontFamily: 'Arial, sans-serif',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        }}
      >
        {players.map((player, index) => (
          <PlayerScore
            key={index}
            player={player}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

interface PlayerScoreProps {
  player: PlayerData;
  frame: number;
  fps: number;
}

const PlayerScore: React.FC<PlayerScoreProps> = ({ player, frame, fps }) => {
  // Track score changes to restart animation
  const scoreHistory = useMemo(() => {
    const history: Array<{ score: number; frame: number }> = [{ score: 0, frame: 0 }];
    return history;
  }, []);

  // Find the most recent score change
  const { previousScore, changeFrame } = useMemo(() => {
    // Check if current score is different from last recorded score
    const lastRecorded = scoreHistory[scoreHistory.length - 1];
    if (player.score !== lastRecorded.score) {
      scoreHistory.push({ score: player.score, frame });
    }

    // Get previous score (for animation start value)
    const prev = scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 2].score : 0;
    const changeF = scoreHistory[scoreHistory.length - 1].frame;

    return { previousScore: prev, changeFrame: changeF };
  }, [player.score, frame, scoreHistory]);

  // Add delay before score animation starts (to let tiles land first)
  // Delay by ~1 second (30 frames) after score changes
  const SCORE_ANIMATION_DELAY = 30; // frames

  // Animate from previous score to current score, with delay after it changed
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

  return (
    <div
      style={{
        marginBottom: '15px',
        padding: '10px 20px',
        backgroundColor: player.onturn
          ? 'rgba(76, 175, 80, 0.8)'
          : 'rgba(50, 50, 50, 0.7)',
        borderRadius: '8px',
        transition: 'background-color 0.3s',
        border: player.onturn ? '2px solid #4CAF50' : '2px solid transparent',
      }}
    >
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
        {player.nickname}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFD700' }}>
        {displayScore}
      </div>
      {player.onturn && (
        <div
          style={{
            fontSize: '14px',
            color: '#90EE90',
            marginTop: '5px',
          }}
        >
          ▶ On turn
        </div>
      )}
    </div>
  );
};
