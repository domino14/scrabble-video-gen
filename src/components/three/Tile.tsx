// Static tile component with letter and score

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { makeNormalMap, tileHeightAt } from '../../lib/procedural-textures';
import { SQUARE_SIZE } from '../../lib/board-coordinates';

interface TileProps {
  letter: string;
  value: number;
  position: [number, number, number];
  color?: string;
  blank?: boolean;
  opacity?: number; // 0-1, for ghost/variation tiles
  textColor?: string; // override text color (e.g. for variation tiles)
}

// Tile color schemes (from liwords)
const TILE_COLORS: Record<string, { hex: string; textColor: string }> = {
  orange: { hex: '#ff6b35', textColor: '#000000' },
  yellow: { hex: '#ffa500', textColor: '#000000' },
  pink: { hex: '#ff69b4', textColor: '#000000' },
  red: { hex: '#e53935', textColor: '#ffffff' },
  blue: { hex: '#1976d2', textColor: '#ffffff' },
  black: { hex: '#2c2c2c', textColor: '#ffffff' },
  white: { hex: '#f5f5f5', textColor: '#000000' },
};

// Shared normal map for all tiles (created once, reused everywhere)
let sharedTileNormalMap: THREE.DataTexture | null = null;
function getTileNormalMap() {
  if (!sharedTileNormalMap) {
    sharedTileNormalMap = makeNormalMap(tileHeightAt, 128, 1.5);
  }
  return sharedTileNormalMap;
}

export const Tile: React.FC<TileProps> = ({
  letter,
  value,
  position,
  color = 'orange',
  blank = false,
  opacity = 1,
  textColor: textColorOverride,
}) => {
  // Use shared normal map (created once)
  const normalMap = getTileNormalMap();

  // Support both named colors (from TILE_COLORS) and raw hex strings (e.g. for variation tiles)
  const colorScheme = TILE_COLORS[color] || null;
  const tileColor = colorScheme ? colorScheme.hex : (color.startsWith('#') ? color : TILE_COLORS.orange.hex);

  // Detect blank tiles (lowercase letters in liwords)
  const isBlank = letter === letter.toLowerCase() && letter !== letter.toUpperCase();
  const displayLetter = letter.toUpperCase();

  // Blank tiles have red text (or blue if tile is red/pink), otherwise use scheme's text color
  const textColor = textColorOverride ?? (isBlank
    ? (color === 'red' || color === 'pink' ? '#0000ff' : '#ff0000')
    : (colorScheme?.textColor ?? '#ffffff'));

  // Create rounded rectangle shape for tile (matching liwords exactly)
  // The shape starts at (0, 0) not centered - this affects positioning!
  const tileShape = useMemo(() => {
    const BEVEL_SIZE = 0.1;
    const BEVEL_THICKNESS = 0.12;
    // Note: width and height are different (tiles are NOT square)
    const width = SQUARE_SIZE - 0.75 - 2 * BEVEL_SIZE;
    const height = SQUARE_SIZE - 0.25 - 2 * BEVEL_SIZE;
    const radius = Math.max(0.1, 0.5 - BEVEL_SIZE);

    const shape = new THREE.Shape();
    // Start at corner, not centered (like liwords)
    shape.moveTo(radius, 0);
    shape.lineTo(width - radius, 0);
    shape.quadraticCurveTo(width, 0, width, radius);
    shape.lineTo(width, height - radius);
    shape.quadraticCurveTo(width, height, width - radius, height);
    shape.lineTo(radius, height);
    shape.quadraticCurveTo(0, height, 0, height - radius);
    shape.lineTo(0, radius);
    shape.quadraticCurveTo(0, 0, radius, 0);

    return shape;
  }, []);

  const tileDepth = 1.5; // Match liwords
  const BEVEL_THICKNESS = 0.12;

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: tileDepth - 2 * BEVEL_THICKNESS, // Account for bevel
    bevelEnabled: true,
    bevelThickness: BEVEL_THICKNESS,
    bevelSize: 0.1,
    bevelSegments: 3,
  };

  // Calculate tile dimensions for text positioning
  const BEVEL_SIZE = 0.1;
  const width = SQUARE_SIZE - 0.75 - 2 * BEVEL_SIZE;
  const height = SQUARE_SIZE - 0.25 - 2 * BEVEL_SIZE;

  return (
    <group position={position}>
      {/* Tile body - no centering offset, liwords calculations assume specific origin */}
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[tileShape, extrudeSettings]} />
        <meshPhysicalMaterial
          color={tileColor}
          normalMap={normalMap}
          clearcoat={0.25}
          clearcoatRoughness={0.3}
          roughness={0.55}
          metalness={0.0}
          normalScale={new THREE.Vector2(0.3, 0.3)}
          envMapIntensity={1.5}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Letter text - using drei Text (no font loading needed) */}
      {displayLetter && (
        <Text
          position={[width / 2, height / 2, tileDepth + 0.05]}
          fontSize={3.3}
          color={textColor}
          anchorX="center"
          anchorY="middle"
        >
          {displayLetter}
        </Text>
      )}

      {/* Score value (small number in corner) - only show if > 0 */}
      {value > 0 && (
        <Text
          position={[width - 0.5, 0.5, tileDepth + 0.05]}
          fontSize={1.2}
          color={textColor}
          anchorX="center"
          anchorY="middle"
        >
          {value}
        </Text>
      )}
    </group>
  );
};
