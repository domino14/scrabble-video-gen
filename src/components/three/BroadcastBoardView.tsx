// Top-down orthographic board view for broadcast mode
// Simplified 3D view without table, rack, or complex lighting

import React from 'react';
import { Board3DData } from '../../types/board-3d-data';
import { BoardBase } from './BoardBase';
import { BoardSquares } from './BoardSquares';
import { BoardLabels } from './BoardLabels';
import { BoardDecals } from './BoardDecals';
import { AnimatedBoardTile } from './AnimatedBoardTile';
import { WoodTable } from './WoodTable';
import { BOARD_COLOR_SCHEMES } from '../../lib/color-schemes';

interface BroadcastBoardViewProps {
  data: Board3DData;
  tileColor?: string;
  boardColor?: string;
}

export const BroadcastBoardView: React.FC<BroadcastBoardViewProps> = ({
  data,
  tileColor = 'orange',
  boardColor = 'jade',
}) => {
  const boardColorHex = BOARD_COLOR_SCHEMES[boardColor as keyof typeof BOARD_COLOR_SCHEMES] ?? BOARD_COLOR_SCHEMES.jade;

  return (
    <>
      {/* Lighting for top-down view */}
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[0, 0, 100]}
        intensity={1.2}
        castShadow={false}
      />
      {/* Overhead fill lights */}
      <pointLight position={[0, 0, 80]} intensity={1.5} />
      <pointLight position={[30, 30, 60]} intensity={0.6} />
      <pointLight position={[-30, -30, 60]} intensity={0.6} />

      {/* Wood table background */}
      <WoodTable />

      {/* Board base (circular board) */}
      <BoardBase color={boardColorHex} />

      {/* Board squares */}
      <BoardSquares boardLayout={data.boardLayout} boardColor={boardColorHex} />

      {/* Board labels (A-O, 1-15) */}
      <BoardLabels />

      {/* Board decals (W logo) */}
      <BoardDecals />

      {/* Tiles on board */}
      {data.tiles.map((tile, index) => (
        <AnimatedBoardTile
          key={`${tile.row}-${tile.col}-${index}`}
          tile={tile}
          tileColor={tileColor}
        />
      ))}
    </>
  );
};
