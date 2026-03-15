// Convert GameHistory to Board3DData states for each turn
// Simplified version of liwords convert.ts

import {
  GameHistory,
  GameEvent,
  GameEvent_Type,
  GameEvent_Direction
} from '../gen/api/proto/vendored/macondo/macondo_pb';
import { Board3DData, TileData, PlayerData } from '../types/board-3d-data';
import { parsePosition } from './board-coordinates';

// Standard Scrabble board layout (CrosswordGame)
const STANDARD_BOARD_LAYOUT = [
  "=  '   =   '  =",
  ' -   "   "   - ',
  "  -   ' '   -  ",
  "'  -   '   -  '",
  "    -     -    ",
  ' "   "   "   " ',
  "  '   ' '   '  ",
  "=  '   -   '  =",
  "  '   ' '   '  ",
  ' "   "   "   " ',
  "    -     -    ",
  "'  -   '   -  '",
  "  -   ' '   -  ",
  ' -   "   "   - ',
  "=  '   =   '  =",
].join('\n');

/**
 * Convert a letter string to an array of individual letters
 */
function rackStringToArray(rack: string): string[] {
  return rack.split('');
}

/**
 * Parse a played tiles string (e.g., "QU.XO..C") where dots represent existing tiles
 */
function parsePlayedTiles(playedTiles: string): Array<{ letter: string; offset: number }> {
  const tiles: Array<{ letter: string; offset: number }> = [];

  for (let i = 0; i < playedTiles.length; i++) {
    const char = playedTiles[i];
    if (char !== '.') {
      tiles.push({ letter: char === '?' ? ' ' : char, offset: i });
    }
  }

  return tiles;
}

/**
 * Determine if a move is horizontal or vertical based on position
 */
function isHorizontal(position: string): boolean {
  // Position format: "8H" or "H8"
  // Horizontal moves have number first, vertical have letter first
  return /^\d/.test(position);
}

/**
 * Check if an event is a tile placement move
 */
function isTilePlacementMove(event: GameEvent): boolean {
  return event.type === GameEvent_Type.TILE_PLACEMENT_MOVE;
}

/**
 * Get all tile positions for a move
 */
function getTilePositions(
  event: GameEvent
): Array<{ row: number; col: number; letter: string; isNew: boolean }> {
  if (!isTilePlacementMove(event)) {
    return [];
  }

  const { row, col } = parsePosition(event.position);
  const playedTiles = parsePlayedTiles(event.playedTiles);
  // Use direction field if available, otherwise infer from position
  const horizontal = event.direction
    ? event.direction === GameEvent_Direction.HORIZONTAL
    : isHorizontal(event.position);

  return playedTiles.map(({ letter, offset }) => ({
    row: horizontal ? row : row + offset,
    col: horizontal ? col + offset : col,
    letter,
    isNew: true,
  }));
}

/**
 * Convert GameHistory to an array of Board3DData states (one per turn)
 */
export function convertGameHistoryToStates(gameHistory: GameHistory): Board3DData[] {
  console.log('Converting game history with', gameHistory.events?.length || 0, 'events');

  const states: Board3DData[] = [];
  const boardTiles = new Map<string, TileData>(); // Track all tiles on board

  // Always use standard Scrabble board layout (ignore proto field)
  const boardLayout = STANDARD_BOARD_LAYOUT;

  console.log('Using standard board layout');

  // Initialize players
  const players: PlayerData[] = gameHistory.players.map((p, index) => ({
    nickname: p.nickname,
    score: 0,
    rack: [],
    onturn: index === 0,
  }));

  // Initial state (empty board)
  states.push({
    tiles: [],
    players: players.map(p => ({ ...p })),
    boardLayout: boardLayout,
    turnNumber: 0,
  });

  // Process each event
  gameHistory.events.forEach((event, eventIndex) => {
    // Find which player made this move
    // Use playerIndex if available, otherwise find by nickname
    const playerIndex = event.playerIndex !== undefined
      ? event.playerIndex
      : players.findIndex(p => p.nickname === event.nickname);

    if (playerIndex === -1 || playerIndex >= players.length) {
      console.warn(`Invalid player index or unknown player: ${event.nickname || event.playerIndex}`);
      return;
    }

    // Update player score
    players[playerIndex].score = event.cumulative;

    // Update player rack — skip for END_RACK_PTS: event.rack is the OTHER player's remaining tiles,
    // not this player's rack (they went out and have no tiles)
    if (event.type !== GameEvent_Type.END_RACK_PTS) {
      players[playerIndex].rack = rackStringToArray(event.rack);
    }

    // Handle tile placement moves
    if (isTilePlacementMove(event)) {
      const newTiles = getTilePositions(event);

      newTiles.forEach(({ row, col, letter, isNew }) => {
        const key = `${row},${col}`;
        const tile: TileData = {
          letter,
          value: getLetterValue(letter),
          blank: letter === letter.toLowerCase() && letter !== letter.toUpperCase(),
          row,
          col,
          isNew,
        };
        boardTiles.set(key, tile);
      });

      // Set current player as on turn (they're making this move)
      // The turn will switch to the next player when their turn starts
      players.forEach((p, i) => {
        p.onturn = i === playerIndex;
      });

      // Create state for this turn
      const turnState: Board3DData = {
        tiles: Array.from(boardTiles.values()).map(t => ({ ...t })),
        players: players.map(p => ({ ...p })), // Copy current player state with correct onturn
        currentEvent: {
          row: event.row,
          column: event.column,
          position: event.position,
          playedTiles: event.playedTiles,
          score: event.score,
          isBingo: event.isBingo || false,
        },
        boardLayout: boardLayout,
        turnNumber: eventIndex + 1,
        lastMoveNotation: `${event.position} ${
          event.wordsFormed?.[0] || event.playedTiles.replace(/\./g, '') || event.note
        }`,
      };

      // Mark tiles as not new for next turn
      boardTiles.forEach((tile) => {
        tile.isNew = false;
      });

      console.log(`State ${states.length + 1}: turn ${turnState.turnNumber}, ${turnState.tiles.length} tiles`);
      states.push(turnState);
    }
    // Handle end-game rack points adjustment
    else if (event.type === GameEvent_Type.END_RACK_PTS) {
      // playerIndex is who GETS the points (the player who went out — empty rack)
      // event.rack contains the tiles from the OTHER player (who has remaining tiles)
      players[playerIndex].rack = []; // went out, no tiles remaining
      const otherPlayerIndex = (playerIndex + 1) % players.length;

      // Update the other player's rack to show their remaining tiles
      players[otherPlayerIndex].rack = rackStringToArray(event.rack);

      // Set the player who gets the points as on turn
      players.forEach((p, i) => {
        p.onturn = i === playerIndex;
      });

      // Create final state with end-game score adjustment
      const endState: Board3DData = {
        tiles: Array.from(boardTiles.values()).map(t => ({ ...t })),
        players: players.map(p => ({ ...p })),
        currentEvent: {
          row: 0,
          column: 0,
          position: 'EndRack',
          playedTiles: event.rack, // The tiles being added
          score: event.endRackPoints,
          isBingo: false,
        },
        boardLayout: boardLayout,
        turnNumber: eventIndex + 1,
        lastMoveNotation: `End: +${event.endRackPoints} points from rack`,
      };

      console.log(`State ${states.length + 1}: end game, +${event.endRackPoints} points to ${players[playerIndex].nickname} from ${players[otherPlayerIndex].nickname}'s rack`);
      states.push(endState);
    }
    // Handle exchanges
    else if (event.type === GameEvent_Type.EXCHANGE) {
      // Set current player as on turn (they're exchanging)
      players.forEach((p, i) => {
        p.onturn = i === playerIndex;
      });

      // Create state for exchange (tiles remain on board, rack updated)
      const exchangeState: Board3DData = {
        tiles: Array.from(boardTiles.values()).map(t => ({ ...t })),
        players: players.map(p => ({ ...p })),
        currentEvent: {
          row: 0,
          column: 0,
          position: 'Exchange',
          playedTiles: event.exchanged, // Tiles being exchanged
          score: 0,
          isBingo: false,
        },
        boardLayout: boardLayout,
        turnNumber: eventIndex + 1,
        lastMoveNotation: `Exchange: ${event.exchanged.length} tile${event.exchanged.length !== 1 ? 's' : ''}`,
      };

      console.log(`State ${states.length + 1}: exchange ${event.exchanged.length} tiles`);
      states.push(exchangeState);
    }
  });

  console.log(`Converted to ${states.length} board states`);
  return states;
}

/**
 * Get the point value for a letter (matching liwords getLetterScore)
 * Blank tiles are represented as lowercase letters and worth 0 points
 */
function getLetterValue(letter: string): number {
  // Detect blank tiles (lowercase letters) - same logic as liwords
  if (letter === letter.toLowerCase() && letter !== letter.toUpperCase()) {
    return 0; // blank tile
  }

  const values: Record<string, number> = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10,
    ' ': 0, // Blank
  };

  return values[letter.toUpperCase()] || 0;
}
