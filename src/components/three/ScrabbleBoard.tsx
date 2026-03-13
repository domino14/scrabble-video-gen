// Main 3D board composition (matching liwords)

import React from 'react';
import { Board3DData } from '../../types/board-3d-data';
import { BoardBase } from './BoardBase';
import { BoardSquares } from './BoardSquares';
import { AnimatedBoardTile } from './AnimatedBoardTile';
import { Rack } from './Rack';
import { WoodTable } from './WoodTable';
import { Lighting } from './Lighting';
import { Environment } from './Environment';
import { BoardLabels } from './BoardLabels';
import { BoardDecals } from './BoardDecals';
import { BOARD_COLOR_SCHEMES } from '../../lib/color-schemes';

interface ScrabbleBoardProps {
  data: Board3DData;
  tileColor?: string;
  boardColor?: string;
}

export const ScrabbleBoard: React.FC<ScrabbleBoardProps> = ({
  data,
  tileColor = 'orange',
  boardColor = 'jade',
}) => {
  // Get board color hex value
  const boardColorHex = BOARD_COLOR_SCHEMES[boardColor as keyof typeof BOARD_COLOR_SCHEMES] ?? BOARD_COLOR_SCHEMES.jade;

  return (
    <>
      {/* HDR Environment */}
      <Environment />

      {/* Lighting */}
      <Lighting />

      {/* Background table */}
      <WoodTable />

      {/* Board base */}
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

      {/* Player rack */}
      <Rack />
    </>
  );
};
