// Player rack component (matching liwords exactly)

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { makeNormalMap, woodHeightAt } from '../../lib/procedural-textures';

interface RackProps {
  // No props needed - positioning is fixed like in liwords
}

// Rack geometry parameters (from liwords line 206)
function rackGeomParams(rackHeight: number, rackDepth: number) {
  const height1 = rackHeight * 0.4;
  const height2 = rackHeight * 0.3;
  const depth1 = 0.16 * rackDepth;
  const depth2 = 0.4 * rackDepth;
  const depth3 = 0.8 * rackDepth;
  const radius1 = 0.015 * rackDepth;
  const radius2 = 0.16 * rackDepth;
  const slope = (rackHeight - radius1 - height2) / (depth2 + radius1 - depth3);
  return { height1, height2, depth1, depth2, depth3, radius1, radius2, slope };
}

// Shared wood normal map (created once)
let sharedWoodNormalMap: THREE.DataTexture | null = null;
function getWoodNormalMap() {
  if (!sharedWoodNormalMap) {
    sharedWoodNormalMap = makeNormalMap(woodHeightAt, 512, 3);
  }
  return sharedWoodNormalMap;
}

export const Rack: React.FC<RackProps> = () => {
  // Rack constants (from liwords line 478)
  const rackHeight = 3;
  const rackWidth = 50;
  const rackDepth = 7;
  const rackYPos = -38;

  // Use shared wood normal map
  const normalMap = getWoodNormalMap();

  // Create rack shape (from liwords line 802-847)
  const rackShape = useMemo(() => {
    const { height2, depth3, depth2, depth1, radius1, radius2 } =
      rackGeomParams(rackHeight, rackDepth);

    const shape = new THREE.Shape();
    shape.moveTo(radius1, 0);
    shape.lineTo(rackDepth - radius1, 0);
    shape.quadraticCurveTo(rackDepth, 0, rackDepth, radius1);
    shape.lineTo(rackDepth, height2);

    const controlPointX = (rackDepth + depth3) / 2;
    const controlPointY = height2 + radius2;
    shape.bezierCurveTo(
      controlPointX,
      controlPointY,
      controlPointX,
      height2,
      depth3,
      height2,
    );

    shape.lineTo(depth2 + radius1, rackHeight - radius1);
    shape.quadraticCurveTo(depth2, rackHeight, depth2 - radius1, rackHeight);
    shape.lineTo(depth1 + radius1, rackHeight);
    shape.quadraticCurveTo(
      depth1,
      rackHeight,
      depth1 - radius1,
      rackHeight - radius1,
    );
    shape.lineTo(0, height2);
    shape.lineTo(0, radius1);
    shape.quadraticCurveTo(0, 0, radius1, 0);

    return shape;
  }, [rackHeight, rackDepth]);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: rackWidth,
    bevelEnabled: false,
  };

  return (
    <mesh
      position={[rackWidth / 2, rackYPos, 2]}
      rotation-x={Math.PI / 2}
      rotation-y={(3 * Math.PI) / 2}
      rotation-z={0}
      receiveShadow
      castShadow
    >
      <extrudeGeometry args={[rackShape, extrudeSettings]} />
      <meshPhysicalMaterial
        color={0xc8a850}
        roughness={0.45}
        metalness={0.0}
        clearcoat={0.2}
        clearcoatRoughness={0.35}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.5, 0.5)}
        envMapIntensity={0.9}
      />
    </mesh>
  );
};
