// BoardHighlight - Dims the board outside a highlighted region and draws a border around it

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SQUARE_SIZE, BOARD_SIZE } from '../../lib/board-coordinates';

interface BoardHighlightProps {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  opacity?: number; // 0-1 for fade-in animation
  highlightColor?: string;
  dimColor?: string;
  dimOpacity?: number;
}

// Board coordinate math matching BoardSquares.tsx
const GRID_OFFSET = (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;
const BOARD_THICKNESS = 2;
const GRID_HEIGHT = 1;

function squareCenterX(col: number) {
  return col * SQUARE_SIZE - GRID_OFFSET;
}

function squareCenterY(row: number) {
  // Board Y increases downward in grid (row 0 = top), but Three.js Y goes up
  return (BOARD_SIZE - 1 - row) * SQUARE_SIZE - GRID_OFFSET;
}

export const BoardHighlight: React.FC<BoardHighlightProps> = ({
  startRow,
  startCol,
  endRow,
  endCol,
  opacity = 1,
  highlightColor = '#FFD700',
  dimColor = '#000000',
  dimOpacity = 0.55,
}) => {
  const r0 = Math.min(startRow, endRow);
  const r1 = Math.max(startRow, endRow);
  const c0 = Math.min(startCol, endCol);
  const c1 = Math.max(startCol, endCol);

  // Highlighted region corners in world space
  const regionLeft   = squareCenterX(c0) - SQUARE_SIZE / 2;
  const regionRight  = squareCenterX(c1) + SQUARE_SIZE / 2;
  const regionBottom = squareCenterY(r1) - SQUARE_SIZE / 2;
  const regionTop    = squareCenterY(r0) + SQUARE_SIZE / 2;
  const regionWidth  = regionRight - regionLeft;
  const regionHeight = regionTop - regionBottom;

  // Full board extents
  const boardHalf = (BOARD_SIZE * SQUARE_SIZE) / 2;
  const boardLeft   = -boardHalf;
  const boardRight  =  boardHalf;
  const boardBottom = -boardHalf;
  const boardTop    =  boardHalf;

  // Z: hug the board square surface to minimize perspective offset from camera at z=100.
  // depthTest={false} on materials ensures visibility above tiles regardless of z.
  // Board squares surface is at BOARD_THICKNESS/2 + GRID_HEIGHT = 2.0; use +0.1 clearance.
  const overlayZ = BOARD_THICKNESS / 2 + GRID_HEIGHT + 0.1; // 2.1
  const borderZ  = overlayZ + 0.1; // 2.2

  // ShapeGeometry with hole: outer rectangle - inner hole
  const dimGeometry = useMemo(() => {
    const outer = new THREE.Shape();
    outer.moveTo(boardLeft,  boardBottom);
    outer.lineTo(boardRight, boardBottom);
    outer.lineTo(boardRight, boardTop);
    outer.lineTo(boardLeft,  boardTop);
    outer.closePath();

    const hole = new THREE.Path();
    hole.moveTo(regionLeft,  regionBottom);
    hole.lineTo(regionRight, regionBottom);
    hole.lineTo(regionRight, regionTop);
    hole.lineTo(regionLeft,  regionTop);
    hole.closePath();

    outer.holes.push(hole);
    return new THREE.ShapeGeometry(outer);
  }, [boardLeft, boardRight, boardBottom, boardTop, regionLeft, regionRight, regionBottom, regionTop]);

  const borderThickness = SQUARE_SIZE * 0.15;
  const effectiveDimOpacity = dimOpacity * opacity;

  return (
    <group>
      {/* Dim overlay with hole */}
      <mesh geometry={dimGeometry} position={[0, 0, overlayZ]}>
        <meshBasicMaterial
          color={dimColor}
          transparent
          opacity={effectiveDimOpacity}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Highlight border — four thin boxes, inset so outer edges align with region boundary */}
      {/* Bottom edge (full width, outer edge at regionBottom) */}
      <mesh position={[(regionLeft + regionRight) / 2, regionBottom + borderThickness / 2, borderZ]}>
        <boxGeometry args={[regionWidth, borderThickness, 0.1]} />
        <meshBasicMaterial color={highlightColor} transparent opacity={opacity} depthWrite={false} depthTest={false} />
      </mesh>
      {/* Top edge (full width, outer edge at regionTop) */}
      <mesh position={[(regionLeft + regionRight) / 2, regionTop - borderThickness / 2, borderZ]}>
        <boxGeometry args={[regionWidth, borderThickness, 0.1]} />
        <meshBasicMaterial color={highlightColor} transparent opacity={opacity} depthWrite={false} depthTest={false} />
      </mesh>
      {/* Left edge (between top/bottom borders, outer edge at regionLeft) */}
      <mesh position={[regionLeft + borderThickness / 2, (regionBottom + regionTop) / 2, borderZ]}>
        <boxGeometry args={[borderThickness, regionHeight - borderThickness * 2, 0.1]} />
        <meshBasicMaterial color={highlightColor} transparent opacity={opacity} depthWrite={false} depthTest={false} />
      </mesh>
      {/* Right edge (between top/bottom borders, outer edge at regionRight) */}
      <mesh position={[regionRight - borderThickness / 2, (regionBottom + regionTop) / 2, borderZ]}>
        <boxGeometry args={[borderThickness, regionHeight - borderThickness * 2, 0.1]} />
        <meshBasicMaterial color={highlightColor} transparent opacity={opacity} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
};
