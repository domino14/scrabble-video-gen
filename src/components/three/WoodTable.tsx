// Wood table background (matching liwords exactly)

import React from 'react';
import * as THREE from 'three';
import { makeNormalMap, woodHeightAt } from '../../lib/procedural-textures';

// Shared wood normal map for table (created once, with tiling)
let sharedTableNormalMap: THREE.DataTexture | null = null;
function getTableNormalMap() {
  if (!sharedTableNormalMap) {
    const tex = makeNormalMap(woodHeightAt, 512, 3);
    tex.repeat.set(6, 4);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    sharedTableNormalMap = tex;
  }
  return sharedTableNormalMap;
}

export const WoodTable: React.FC = () => {
  // Use shared table normal map
  const normalMap = getTableNormalMap();

  return (
    <>
      {/* Table top (from liwords line 615) */}
      <mesh receiveShadow castShadow position={[0, 0, -3]}>
        <boxGeometry args={[180, 140, 4]} />
        <meshPhysicalMaterial
          color={0x8b4513}
          roughness={0.6}
          metalness={0.0}
          clearcoat={0.15}
          clearcoatRoughness={0.4}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          envMapIntensity={0.7}
        />
      </mesh>

      {/* Table legs (from liwords line 631) */}
      {[
        [-80, -60],
        [80, -60],
        [-80, 60],
        [80, 60],
      ].map(([lx, ly], index) => (
        <mesh key={index} castShadow position={[lx, ly, -23]}>
          <boxGeometry args={[4, 4, 40]} />
          <meshPhysicalMaterial
            color={0x654321}
            roughness={0.65}
            metalness={0.0}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(0.35, 0.35)}
          />
        </mesh>
      ))}
    </>
  );
};
