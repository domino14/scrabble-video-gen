// Opening intro scene

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { GameHistory } from '../gen/api/proto/vendored/macondo/macondo_pb';

interface IntroSceneProps {
  gameHistory: GameHistory;
}

export const IntroScene: React.FC<IntroSceneProps> = ({ gameHistory }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Access time_control_name from the game data (may not be in proto type)
  const timeControlName = (gameHistory as any).time_control_name as string | undefined;

  // Animate elements with stagger
  const titleOpacity = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const titleScale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: {
      damping: 15,
      stiffness: 120,
    },
  });

  const playersOpacity = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const detailsOpacity = spring({
    frame: frame - 40,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

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
          transform: `scale(${titleScale})`,
          marginBottom: '60px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: '#FFD700',
            textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)',
            marginBottom: '10px',
          }}
        >
          {gameHistory.title || 'Scrabble Game Analysis'}
        </div>
        {gameHistory.description && (
          <div
            style={{
              fontSize: '24px',
              color: '#ccc',
            }}
          >
            {gameHistory.description}
          </div>
        )}
      </div>

      {/* Players */}
      <div
        style={{
          opacity: playersOpacity,
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          Players
        </div>
        <div
          style={{
            display: 'flex',
            gap: '40px',
            justifyContent: 'center',
          }}
        >
          {gameHistory.players.map((player, index) => (
            <div
              key={index}
              style={{
                padding: '20px 40px',
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid #4CAF50',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: 'white',
                }}
              >
                {player.nickname}
              </div>
              {player.real_name && player.real_name !== player.nickname && (
                <div
                  style={{
                    fontSize: '18px',
                    color: '#aaa',
                    marginTop: '5px',
                  }}
                >
                  {player.real_name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Game details */}
      <div
        style={{
          opacity: detailsOpacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '20px',
            color: '#888',
            marginBottom: '10px',
          }}
        >
          Lexicon: <span style={{ color: '#4CAF50' }}>{gameHistory.lexicon}</span>
        </div>
        {timeControlName && (
          <div
            style={{
              fontSize: '20px',
              color: '#888',
            }}
          >
            Time Control: <span style={{ color: '#4CAF50' }}>{timeControlName}</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
