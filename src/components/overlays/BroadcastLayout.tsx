// Broadcast layout wrapper component
// Coordinates all broadcast mode overlays in a fixed 1920x1080 layout

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Board3DData } from '../../types/board-3d-data';
import { RemainingTilesWidget } from './RemainingTilesWidget';
import { MoveNotation } from './MoveNotation';
import { GameInfoWidget } from './GameInfoWidget';
import { BroadcastScoreWidget } from './BroadcastScoreWidget';
import { PlayerAvatarWidget } from './PlayerAvatarWidget';
import { ExpressionType } from '../../types/avatar';

interface BroadcastLayoutProps {
  boardState: Board3DData;
  tilePoolBoardState: Board3DData; // Board state for tile pool calculation
  tileColor?: string;
  showMoveNotation?: boolean;
  moveNotationStartFrame?: number;
  player0Expression?: ExpressionType;
  player0ExpressionIntensity?: number;
  player1Expression?: ExpressionType;
  player1ExpressionIntensity?: number;
  currentFrame: number;
}

export const BroadcastLayout: React.FC<BroadcastLayoutProps> = ({
  boardState,
  tilePoolBoardState,
  tileColor = 'orange',
  showMoveNotation = false,
  moveNotationStartFrame = 0,
  player0Expression = 'idle',
  player0ExpressionIntensity = 0,
  player1Expression = 'idle',
  player1ExpressionIntensity = 0,
  currentFrame,
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

      {/* Avatar camera widgets */}
      {boardState.players[0] && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              bottom: '370px',
              left: '100px',
              width: '255px',
              height: '255px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              backgroundColor: '#D3D3D3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayerAvatarWidget
              nickname={boardState.players[0].nickname}
              expression={player0Expression}
              expressionIntensity={player0ExpressionIntensity}
              currentFrame={currentFrame}
              playerIndex={0}
            />
          </div>
        </AbsoluteFill>
      )}
      {boardState.players[1] && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              bottom: '370px',
              right: '100px',
              width: '255px',
              height: '255px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              backgroundColor: '#D3D3D3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayerAvatarWidget
              nickname={boardState.players[1].nickname}
              expression={player1Expression}
              expressionIntensity={player1ExpressionIntensity}
              currentFrame={currentFrame}
              playerIndex={1}
            />
          </div>
        </AbsoluteFill>
      )}

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
