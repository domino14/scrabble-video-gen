// Circular board base component (matching liwords exactly)

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { makeNormalMap, boardHeightAt } from '../../lib/procedural-textures';

interface BoardBaseProps {
  color?: number;
}

// Shared normal map for board (created once)
let sharedBoardNormalMap: THREE.DataTexture | null = null;
function getBoardNormalMap() {
  if (!sharedBoardNormalMap) {
    sharedBoardNormalMap = makeNormalMap(boardHeightAt, 256, 3);
  }
  return sharedBoardNormalMap;
}

export const BoardBase: React.FC<BoardBaseProps> = ({ color = 0x00ffbd }) => {
  // Use shared normal map
  const normalMap = getBoardNormalMap();

  return (
    <mesh receiveShadow position={[0, 0, 0]} rotation-x={Math.PI / 2}>
      {/* Cylindrical base (from liwords line 495) */}
      <cylinderGeometry args={[55, 55, 2, 64]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.35}
        metalness={0.05}
        clearcoat={0.5}
        clearcoatRoughness={0.2}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.12, 0.12)}
        envMapIntensity={0.9}
      />
    </mesh>
  );
};
