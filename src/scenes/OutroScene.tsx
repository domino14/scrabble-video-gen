// Outro scene with final scores

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { GameHistory } from '../gen/api/proto/vendored/macondo/macondo_pb';

interface OutroSceneProps {
  gameHistory: GameHistory;
}

export const OutroScene: React.FC<OutroSceneProps> = ({ gameHistory }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate elements with stagger
  const titleOpacity = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const scoresOpacity = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const winnerOpacity = spring({
    frame: frame - 40,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const ctaOpacity = spring({
    frame: frame - 60,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const winnerIndex = gameHistory.winner;
  const winnerName = gameHistory.players[winnerIndex]?.nickname || 'Unknown';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          marginBottom: '60px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          Final Scores
        </div>
      </div>

      {/* Scores */}
      <div
        style={{
          opacity: scoresOpacity,
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '40px',
            justifyContent: 'center',
          }}
        >
          {gameHistory.players.map((player, index) => {
            const score = gameHistory.final_scores?.[index] || 0;
            const isWinner = index === winnerIndex;

            return (
              <div
                key={index}
                style={{
                  padding: '30px 50px',
                  backgroundColor: isWinner
                    ? 'rgba(255, 215, 0, 0.2)'
                    : 'rgba(50, 50, 50, 0.5)',
                  border: isWinner
                    ? '3px solid #FFD700'
                    : '2px solid #666',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '10px',
                  }}
                >
                  {player.nickname}
                </div>
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 'bold',
                    color: isWinner ? '#FFD700' : '#4CAF50',
                  }}
                >
                  {score}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner announcement */}
      <div
        style={{
          opacity: winnerOpacity,
          marginBottom: '60px',
        }}
      >
        <div
          style={{
            padding: '20px 40px',
            backgroundColor: 'rgba(255, 215, 0, 0.3)',
            border: '3px solid #FFD700',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#FFD700',
            }}
          >
            🏆 {winnerName} Wins! 🏆
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div
        style={{
          opacity: ctaOpacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            color: '#888',
            marginBottom: '15px',
          }}
        >
          Thanks for watching!
        </div>
        <div
          style={{
            fontSize: '20px',
            color: '#4CAF50',
          }}
        >
          Like & Subscribe for more Scrabble analysis
        </div>
      </div>
    </AbsoluteFill>
  );
};
