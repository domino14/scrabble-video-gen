// Tile distribution and remaining tile computation for Scrabble

import { TileData } from '../types/board-3d-data';

/**
 * Standard English Scrabble tile distribution
 */
export const ENGLISH_TILE_DISTRIBUTION: Record<string, number> = {
  'A': 9,
  'B': 2,
  'C': 2,
  'D': 4,
  'E': 12,
  'F': 2,
  'G': 3,
  'H': 2,
  'I': 9,
  'J': 1,
  'K': 1,
  'L': 4,
  'M': 2,
  'N': 6,
  'O': 8,
  'P': 2,
  'Q': 1,
  'R': 6,
  'S': 4,
  'T': 6,
  'U': 4,
  'V': 2,
  'W': 2,
  'X': 1,
  'Y': 2,
  'Z': 1,
  '?': 2, // Blanks
};

/**
 * Compute remaining tiles in the bag based on board state and player racks
 */
export function computeRemainingTiles(
  boardTiles: TileData[],
  player1Rack: string[],
  player2Rack: string[]
): Record<string, number> {
  // Start with full distribution
  const remaining = { ...ENGLISH_TILE_DISTRIBUTION };

  // Subtract board tiles
  for (const tile of boardTiles) {
    // If it's a blank (designated blank), subtract from blank pool
    const letter = tile.blank ? '?' : tile.letter.toUpperCase();
    if (remaining[letter] !== undefined) {
      remaining[letter] = Math.max(0, remaining[letter] - 1);
    }
  }

  // Subtract player 1 rack
  for (const letter of player1Rack) {
    const upperLetter = letter === ' ' ? '?' : letter.toUpperCase();
    if (remaining[upperLetter] !== undefined) {
      remaining[upperLetter] = Math.max(0, remaining[upperLetter] - 1);
    }
  }

  // Subtract player 2 rack
  for (const letter of player2Rack) {
    const upperLetter = letter === ' ' ? '?' : letter.toUpperCase();
    if (remaining[upperLetter] !== undefined) {
      remaining[upperLetter] = Math.max(0, remaining[upperLetter] - 1);
    }
  }

  return remaining;
}

/**
 * Format remaining tiles as a sorted string for display (e.g., "A A B D F G...")
 */
export function formatRemainingTiles(remaining: Record<string, number>): string {
  const tiles: string[] = [];

  // Get all letters with counts > 0
  const letters = Object.keys(remaining)
    .filter(letter => remaining[letter] > 0)
    .sort();

  // Add each letter the appropriate number of times
  for (const letter of letters) {
    for (let i = 0; i < remaining[letter]; i++) {
      tiles.push(letter === '?' ? '?' : letter);
    }
  }

  return tiles.join(' ');
}
