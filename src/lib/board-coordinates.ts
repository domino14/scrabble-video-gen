// Board coordinate calculations for positioning tiles and elements

import * as THREE from 'three';

// Constants
export const SQUARE_SIZE = 5; // Units per square
export const BOARD_SIZE = 15; // 15x15 grid
export const BOARD_WIDTH = SQUARE_SIZE * BOARD_SIZE;
export const BOARD_HEIGHT = 2; // Height of board base
export const TILE_HEIGHT = 1.2; // Height of tile
export const RACK_CAPACITY = 7; // Number of tiles in rack

/**
 * Get 3D position for a board square (row, col)
 * Board is centered at origin, rows go down (0-14), cols go right (0-14)
 */
export function getBoardPosition(row: number, col: number): THREE.Vector3 {
  // Center the board at origin (matching liwords offset calculations)
  const gridSize = BOARD_SIZE; // 15
  const offset = (gridSize * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2; // 35

  // Tile positioning with offsets to center non-centered tiles (from liwords)
  const x = col * SQUARE_SIZE - offset - SQUARE_SIZE / 2 + 0.375;
  const y = (gridSize - 1 - row) * SQUARE_SIZE - offset - SQUARE_SIZE / 2 + 0.125;
  const z = BOARD_HEIGHT / 2 + 1; // boardThickness/2 + gridHeight (from liwords)

  return new THREE.Vector3(x, y, z);
}

/**
 * Get 3D position for a tile in the rack
 * Rack is positioned below the board
 * Uses exact liwords calculations
 */
export function getRackPosition(index: number): THREE.Vector3 {
  if (index < 0 || index >= RACK_CAPACITY) {
    throw new Error(`Invalid rack index: ${index}. Must be 0-${RACK_CAPACITY - 1}`);
  }

  // Rack constants (matching Rack.tsx and liwords)
  const rackHeight = 3;
  const rackWidth = 50;
  const rackDepth = 7;
  const rackYPos = -38;
  const rackBodyZ = 2; // Z position of rack body
  const BEVEL_SIZE = 0.1;
  const BEVEL_THICKNESS = 0.12;

  // Calculate rack geometry parameters
  const height2 = rackHeight * 0.3;
  const depth3 = 0.8 * rackDepth;
  const depth2 = 0.4 * rackDepth;
  const radius1 = 0.015 * rackDepth;
  const slope = (rackHeight - radius1 - height2) / (depth2 + radius1 - depth3);

  // Calculate tile rotation angle
  const theta = -Math.atan(slope);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Calculate tile Y and Z positions (from liwords line 893-902)
  const tileY = rackYPos - depth3 + BEVEL_SIZE * cosT - BEVEL_THICKNESS * sinT;
  const tileZ = rackBodyZ + height2 + BEVEL_SIZE * sinT + BEVEL_THICKNESS * cosT;

  // Calculate X position (centered tiles)
  const xpos = -rackWidth / 2 + 2 * SQUARE_SIZE + index * (SQUARE_SIZE - 0.6);

  return new THREE.Vector3(xpos, tileY, tileZ);
}

/**
 * Get the rotation angle for tiles on the rack
 */
export function getRackTileRotation(): number {
  const rackHeight = 3;
  const rackDepth = 7;
  const height2 = rackHeight * 0.3;
  const depth3 = 0.8 * rackDepth;
  const depth2 = 0.4 * rackDepth;
  const radius1 = 0.015 * rackDepth;
  const slope = (rackHeight - radius1 - height2) / (depth2 + radius1 - depth3);
  return -Math.atan(slope);
}

/**
 * Convert position notation to row/col
 * Handles both formats:
 * - "8H" (horizontal): row 7 (0-indexed), col 7 (H is 8th letter)
 * - "E5" (vertical): row 4, col 4
 * Returns { row, col } where row is 0-14, col is 0-14
 */
export function parsePosition(position: string): { row: number; col: number } {
  if (!position || position.length < 2) {
    throw new Error(`Invalid position: ${position}`);
  }

  // Try format "8H" (number first - horizontal)
  const horizontalMatch = position.match(/^(\d+)([A-O])$/i);
  if (horizontalMatch) {
    const row = parseInt(horizontalMatch[1], 10) - 1; // Convert to 0-indexed
    const col = horizontalMatch[2].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    return { row, col };
  }

  // Try format "E5" (letter first - vertical)
  const verticalMatch = position.match(/^([A-O])(\d+)$/i);
  if (verticalMatch) {
    const col = verticalMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    const row = parseInt(verticalMatch[2], 10) - 1; // Convert to 0-indexed
    return { row, col };
  }

  throw new Error(`Invalid position format: ${position}`);
}

/**
 * Check if a row/col is within board bounds
 */
export function isValidSquare(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Get camera position for overview shot
 */
export function getOverviewCameraPosition(): THREE.Vector3 {
  return new THREE.Vector3(0, -50, 130);
}

/**
 * Get camera look-at target for overview shot
 */
export function getOverviewCameraTarget(): THREE.Vector3 {
  return new THREE.Vector3(0, -10, 0);
}

/**
 * Get camera position for zooming to a specific square
 */
export function getZoomCameraPosition(row: number, col: number): THREE.Vector3 {
  const boardPos = getBoardPosition(row, col);
  // Closer zoom: lower z (height) and adjust y offset for better angle
  return new THREE.Vector3(boardPos.x, boardPos.y - 15, 25);
}

/**
 * Get camera position for dramatic angle view
 */
export function getDramaticCameraPosition(): THREE.Vector3 {
  return new THREE.Vector3(50, -20, 80);
}

/**
 * Get camera position for rack view
 */
export function getRackCameraPosition(): THREE.Vector3 {
  return new THREE.Vector3(0, -70, 40);
}
