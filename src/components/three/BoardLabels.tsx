// Board row and column labels (A-O, 1-15)

import React from 'react';
import { Text } from '@react-three/drei';
import { SQUARE_SIZE, BOARD_SIZE } from '../../lib/board-coordinates';

interface BoardLabelsProps {
  labelColor?: string;
}

export const BoardLabels: React.FC<BoardLabelsProps> = ({ labelColor = '#888888' }) => {
  const gridSize = BOARD_SIZE;
  const offset = (gridSize * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;
  const z = 1 + 0.01; // Just above board surface

  return (
    <>
      {/* Column labels (A, B, C, ..., O) */}
      {Array.from({ length: gridSize }, (_, i) => {
        const letter = String.fromCharCode(65 + i); // A = 65
        const x = i * SQUARE_SIZE - offset; // centered exactly on each square
        const y = offset + SQUARE_SIZE * 1.0; // enough clearance above top row for descenders

        return (
          <Text
            key={`col-${i}`}
            position={[x, y, z]}
            fontSize={SQUARE_SIZE * 0.45}
            color={labelColor}
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
          >
            {letter}
          </Text>
        );
      })}

      {/* Row labels (1, 2, 3, ..., 15) */}
      {Array.from({ length: gridSize }, (_, i) => {
        const number = (i + 1).toString();
        const textWidth = number.length * SQUARE_SIZE * 0.3;
        // Offsets adjusted for troika-three-text vs TextGeometry rendering difference
        const x = -offset - SQUARE_SIZE * 0.65 - textWidth + 0.2;
        const y = (gridSize - 1 - i) * SQUARE_SIZE - offset - SQUARE_SIZE / 4 + 1.3;

        return (
          <Text
            key={`row-${i}`}
            position={[x, y, z]}
            fontSize={SQUARE_SIZE * 0.45}
            color={labelColor}
            anchorX="left"
            anchorY="middle"
            fontWeight={700}
          >
            {number}
          </Text>
        );
      })}
    </>
  );
};
