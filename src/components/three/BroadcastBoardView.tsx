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
import { Tile } from './Tile';
import { BoardHighlight } from './BoardHighlight';
import { BOARD_COLOR_SCHEMES, VARIATION_TILE_COLOR, VARIATION_TILE_TEXT_COLOR } from '../../lib/color-schemes';
import { getBoardPosition } from '../../lib/board-coordinates';

interface VariationTileData {
  row: number;
  col: number;
  letter: string;
  value: number;
}

interface BroadcastBoardViewProps {
  data: Board3DData;
  tileColor?: string;
  boardColor?: string;
  variationTiles?: VariationTileData[];
  variationOpacity?: number;
  variationTileColor?: string;
  variationTextColor?: string;
  highlightRegion?: { startRow: number; startCol: number; endRow: number; endCol: number };
  highlightOpacity?: number;
}

export const BroadcastBoardView: React.FC<BroadcastBoardViewProps> = ({
  data,
  tileColor = 'orange',
  boardColor = 'jade',
  variationTiles,
  variationOpacity = 0,
  variationTileColor = VARIATION_TILE_COLOR,
  variationTextColor = VARIATION_TILE_TEXT_COLOR,
  highlightRegion,
  highlightOpacity = 0,
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

      {/* Variation tiles (ghost/hypothetical moves) */}
      {variationTiles && variationOpacity > 0 && variationTiles.map((tile, index) => {
        const pos = getBoardPosition(tile.row, tile.col);
        const isBlank = tile.letter === tile.letter.toLowerCase() && tile.letter !== tile.letter.toUpperCase();
        // Blanks get muted red text; non-blanks use the configured text color
        const tileTextColor = isBlank ? '#cc4444' : variationTextColor;
        return (
          <group key={`variation-${tile.row}-${tile.col}-${index}`} position={[pos.x, pos.y, pos.z]}>
            <Tile
              letter={tile.letter}
              value={tile.value}
              position={[0, 0, 0]}
              color={variationTileColor}
              opacity={variationOpacity}
              textColor={tileTextColor}
            />
          </group>
        );
      })}

      {/* Board highlight overlay */}
      {highlightRegion && highlightOpacity > 0 && (
        <BoardHighlight
          startRow={highlightRegion.startRow}
          startCol={highlightRegion.startCol}
          endRow={highlightRegion.endRow}
          endCol={highlightRegion.endCol}
          opacity={highlightOpacity}
        />
      )}
    </>
  );
};
