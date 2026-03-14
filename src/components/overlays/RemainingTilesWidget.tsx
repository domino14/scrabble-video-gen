// Remaining tiles widget for broadcast mode
// Displays the tiles remaining in the bag + opponent's rack (unseen) in the left column

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TileData } from '../../types/board-3d-data';
import { computeRemainingTiles, formatRemainingTiles } from '../../lib/tile-pool';

interface RemainingTilesWidgetProps {
  boardTiles: TileData[];
  player1Rack: string[];
  player2Rack: string[];
  player1OnTurn: boolean;
}

export const RemainingTilesWidget: React.FC<RemainingTilesWidgetProps> = ({
  boardTiles,
  player1Rack,
  player2Rack,
  player1OnTurn,
}) => {
  // Calculate from perspective of on-turn player
  // Bag + unseen = all tiles - board - my rack (opponent's rack is "unseen")
  const myRack = player1OnTurn ? player1Rack : player2Rack;
  const remaining = computeRemainingTiles(boardTiles, myRack, []);
  const formattedTiles = formatRemainingTiles(remaining);

  // Count total tiles (bag + opponent's rack)
  const totalRemaining = Object.values(remaining).reduce((sum, count) => sum + count, 0);

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
          left: '40px',
          width: '440px',
          height: '420px',
        }}
      >
        {/* Header */}
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
          Bag + unseen ({totalRemaining})
        </div>

        {/* Tile pool with wrapping */}
        <div
          style={{
            height: 'calc(100% - 50px)',
            backgroundColor: 'rgba(10, 10, 10, 0.9)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '12px',
            fontFamily: 'monospace',
            color: 'white',
            fontSize: '33px',
            fontWeight: 'normal',
            letterSpacing: '2px',
            lineHeight: '1.4',
            wordWrap: 'break-word',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {formattedTiles || 'EMPTY'}
        </div>
      </div>
    </AbsoluteFill>
  );
};
