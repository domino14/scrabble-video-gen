// Game info widget for broadcast mode
// Displays league/tournament info and player names

import React from 'react';
import { AbsoluteFill } from 'remotion';

interface GameInfoWidgetProps {
  player1Name: string;
  player2Name: string;
  leagueName?: string;
  season?: string;
}

export const GameInfoWidget: React.FC<GameInfoWidgetProps> = ({
  player1Name,
  player2Name,
  leagueName = 'League Game',
  season,
}) => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '380px',
        }}
      >
        {/* League info header */}
        <div
          style={{
            height: '50px',
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
          }}
        >
          {leagueName}
        </div>

        {/* Game participants */}
        <div
          style={{
            backgroundColor: 'rgba(10, 10, 10, 0.9)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {season && (
            <div
              style={{
                fontFamily: 'Arial, sans-serif',
                color: 'white',
                fontSize: '22px',
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              {season}
            </div>
          )}
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              color: 'white',
              fontSize: '20px',
              textAlign: 'center',
              marginBottom: '10px',
            }}
          >
            Game Between:
          </div>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              color: '#FFD700',
              fontSize: '28px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            {player1Name}
          </div>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              color: 'white',
              fontSize: '20px',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            vs
          </div>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              color: '#FFD700',
              fontSize: '28px',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            {player2Name}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
