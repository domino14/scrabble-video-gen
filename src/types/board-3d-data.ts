// Board3DData interface for 3D rendering
// Adapted from liwords board3d types

export interface TileData {
  letter: string;
  value: number;
  blank?: boolean;
  row: number;
  col: number;
  isNew?: boolean; // Newly placed this turn
}

export interface PlayerData {
  nickname: string;
  score: number;
  rack: string[];
  onturn: boolean;
}

export interface Board3DData {
  tiles: TileData[];
  players: PlayerData[];
  currentEvent?: {
    row: number;
    column: number;
    position: string;
    playedTiles: string;
    score: number;
    isBingo: boolean;
  };
  boardLayout: string; // 15x15 grid with bonus square markers
  turnNumber: number;
  lastMoveNotation?: string; // e.g., "8D QUIXOTIC"
}

// Bonus square types in board layout (from liwords)
export const BONUS_LABELS: Record<string, string> = {
  '=': '3W', // Triple Word Score
  '-': '2W', // Double Word Score
  '"': '3L', // Triple Letter Score
  "'": '2L', // Double Letter Score
  '~': '4W', // Quad Word (super Scrabble)
  '^': '4L', // Quad Letter (super Scrabble)
  '*': '',   // Center star
  ' ': '',   // Regular square
  '.': '',   // Regular square (dot notation)
};

// Color mapping for bonus squares (exact hex from liwords)
export const BONUS_COLORS: Record<string, number> = {
  '=': 0xcc5555, // Triple Word - red
  '-': 0xff9999, // Double Word - pink
  '"': 0x5566cc, // Triple Letter - blue
  "'": 0x4eb7e1, // Double Letter - cyan
  '~': 0x22ff22, // Quad Word - green
  '^': 0x99ff99, // Quad Letter - light green
  '*': 0x000000, // Center star - black
  ' ': 0xffffff, // Regular - white
  '.': 0xffffff, // Regular - white (dot notation)
};
