// Broadcast layout wrapper component
// Coordinates all broadcast mode overlays in a fixed 1920x1080 layout

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Board3DData } from '../../types/board-3d-data';
import { RemainingTilesWidget } from './RemainingTilesWidget';
import { MoveNotation } from './MoveNotation';
import { GameInfoWidget } from './GameInfoWidget';
import { BroadcastScoreWidget } from './BroadcastScoreWidget';

interface BroadcastLayoutProps {
  boardState: Board3DData;
  tilePoolBoardState: Board3DData; // Board state for tile pool calculation
  tileColor?: string;
  showMoveNotation?: boolean;
  moveNotationStartFrame?: number;
}

export const BroadcastLayout: React.FC<BroadcastLayoutProps> = ({
  boardState,
  tilePoolBoardState,
  tileColor = 'orange',
  showMoveNotation = false,
  moveNotationStartFrame = 0,
}) => {
  const player1OnTurn = tilePoolBoardState.players[0]?.onturn || false;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
      }}
    >
      {/* Remaining tiles widget (top left) */}
      <RemainingTilesWidget
        boardTiles={tilePoolBoardState.tiles}
        player1Rack={tilePoolBoardState.players[0]?.rack || []}
        player2Rack={tilePoolBoardState.players[1]?.rack || []}
        player1OnTurn={player1OnTurn}
      />

      {/* Game info widget (top right) */}
      <GameInfoWidget
        player1Name={boardState.players[0]?.nickname || 'Player 1'}
        player2Name={boardState.players[1]?.nickname || 'Player 2'}
        leagueName="NWL League"
        season="Season 9"
      />

      {/* Score widgets */}
      {boardState.players[0] && (
        <BroadcastScoreWidget
          player={boardState.players[0]}
          position="left"
        />
      )}
      {boardState.players[1] && (
        <BroadcastScoreWidget
          player={boardState.players[1]}
          position="right"
        />
      )}

      {/* Move notation (bottom center) */}
      {showMoveNotation && boardState.currentEvent && (
        <MoveNotation
          notation={boardState.lastMoveNotation}
          isBingo={boardState.currentEvent.isBingo}
          score={boardState.currentEvent.score}
          startFrame={moveNotationStartFrame}
        />
      )}
    </AbsoluteFill>
  );
};
