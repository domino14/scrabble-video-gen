// Player widget for broadcast mode
// Displays player name and score

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PlayerData } from '../../types/board-3d-data';

interface PlayerWidgetProps {
  player: PlayerData;
  position: 'left' | 'right';
  tileColor?: string;
}

export const PlayerWidget: React.FC<PlayerWidgetProps> = ({
  player,
  position,
  tileColor = 'orange',
}) => {
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
          bottom: '40px',
          [isLeft ? 'left' : 'right']: '40px',
          width: '380px',
          fontFamily: 'Arial, sans-serif',
          color: 'white',
        }}
      >
        {/* Player avatar placeholder */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: player.onturn ? '#4CAF50' : '#555',
            border: '3px solid ' + (player.onturn ? '#66BB6A' : '#777'),
            marginBottom: '12px',
            marginLeft: isLeft ? '0' : 'auto',
            marginRight: isLeft ? 'auto' : '0',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
          }}
        />

        {/* Player info card */}
        <div
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            borderRadius: '12px',
            padding: '16px',
            border: '2px solid ' + (player.onturn ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'),
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Player name */}
          <div
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              marginBottom: '8px',
              textAlign: 'center',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            {player.nickname}
          </div>

          {/* Score */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#FFD700',
              textAlign: 'center',
              marginBottom: '12px',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            {player.score}
          </div>

          {/* On turn indicator */}
          {player.onturn && (
            <div
              style={{
                fontSize: '14px',
                color: '#90EE90',
                marginTop: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              ▶ ON TURN
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
