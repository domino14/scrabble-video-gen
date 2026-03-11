// Color schemes from liwords

export const TILE_COLOR_SCHEMES = {
  orange: { hex: '#ff6b35', textColor: '#000000' },
  yellow: { hex: '#ffa500', textColor: '#000000' },
  pink: { hex: '#ff69b4', textColor: '#000000' },
  red: { hex: '#e53935', textColor: '#ffffff' },
  blue: { hex: '#1976d2', textColor: '#ffffff' },
  black: { hex: '#2c2c2c', textColor: '#ffffff' },
  white: { hex: '#f5f5f5', textColor: '#000000' },
} as const;

export const BOARD_COLOR_SCHEMES = {
  jade: '#00ffbd',
  teal: '#00897b',
  blue: '#2196f3',
  purple: '#9c27b0',
  green: '#4caf50',
  yellow: '#f0c000',
  red: '#c62828',
  slate: '#455a64',
} as const;

export const BONUS_COLORS = {
  '=': '#cc5555', // Triple word score
  '-': '#ff9999', // Double word score
  '"': '#5566cc', // Triple letter score
  "'": '#4eb7e1', // Double letter score
  '~': '#22ff22', // Custom bonus (if used)
  '^': '#99ff99', // Custom bonus (if used)
} as const;

export type TileColorName = keyof typeof TILE_COLOR_SCHEMES;
export type BoardColorName = keyof typeof BOARD_COLOR_SCHEMES;
