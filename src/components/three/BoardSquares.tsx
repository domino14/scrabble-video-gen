// 15x15 grid of board squares with bonus colors (matching liwords exactly)

import React from 'react';
import { BONUS_COLORS, BONUS_LABELS } from '../../types/board-3d-data';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface BoardSquaresProps {
  boardLayout: string; // 15x15 grid string with bonus markers
  boardColor: number;
}

// Parse board layout into 15x15 grid
function parseBoardLayout(layout: string): string[][] {
  const lines = layout.trim().split('\n');
  // Each character position in the string is a square (spaces are regular squares)
  return lines.map(line => {
    // Pad or trim to exactly 15 characters
    const padded = line.padEnd(15, ' ').substring(0, 15);
    return padded.split('');
  });
}

// Get label color based on board brightness (from liwords line 159)
function getLabelColor(boardColor: number): number {
  const r = (boardColor >> 16) & 0xff;
  const g = (boardColor >> 8) & 0xff;
  const b = boardColor & 0xff;
  const brightness = r * 0.299 + g * 0.587 + b * 0.114;
  return brightness > 128 ? 0x222222 : 0xffffff;
}

export const BoardSquares: React.FC<BoardSquaresProps> = ({ boardLayout, boardColor }) => {
  const grid = parseBoardLayout(boardLayout);
  const gridSize = 15;
  const squareSize = 5;
  const offset = (gridSize * squareSize) / 2 - squareSize / 2;
  const boardThickness = 2;
  const gridHeight = 1;
  const gridBottomZPos = boardThickness / 2;
  const wallThickness = squareSize * 0.05;
  const wallHeight = squareSize * 0.11;
  const labelColor = getLabelColor(boardColor);

  return (
    <group>
      {/* Grid squares (from liwords line 518) */}
      {grid.map((row, j) =>
        row.map((bonusChar, i) => {
          const bonusColor = BONUS_COLORS[bonusChar] || 0xffffff;
          const x = i * squareSize - offset;
          const y = j * squareSize - offset;
          const z = gridBottomZPos + gridHeight / 2;

          return (
            <group key={`${j}-${i}`}>
              {/* Square */}
              <mesh position={[x, y, z]} receiveShadow>
                <boxGeometry args={[squareSize, squareSize, gridHeight]} />
                <meshStandardMaterial
                  color={bonusColor}
                  roughness={0.8}
                  metalness={0.0}
                  envMapIntensity={0.5}
                />
              </mesh>

              {/* Bonus label text */}
              {BONUS_LABELS[bonusChar] && (
                <Text
                  position={[x, y, gridBottomZPos + 1 + 0.01]}
                  fontSize={squareSize * 0.28}
                  color={labelColor}
                  anchorX="center"
                  anchorY="middle"
                >
                  {BONUS_LABELS[bonusChar]}
                </Text>
              )}

              {/* Grid walls (from liwords line 545) */}
              {[
                [x, y + squareSize / 2, squareSize, wallThickness],
                [x, y - squareSize / 2, squareSize, wallThickness],
                [x - squareSize / 2, y, wallThickness, squareSize],
                [x + squareSize / 2, y, wallThickness, squareSize],
              ].map(([wx, wy, width, height], idx) => (
                <mesh
                  key={idx}
                  position={[wx, wy, gridBottomZPos + gridHeight]}
                >
                  <boxGeometry args={[width, height, wallHeight]} />
                  <meshBasicMaterial color={0x444444} />
                </mesh>
              ))}
            </group>
          );
        })
      )}
    </group>
  );
};
