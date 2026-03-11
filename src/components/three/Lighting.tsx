// Lighting setup for 3D scene (matching liwords exactly)

import React from 'react';

export const Lighting: React.FC = () => {
  return (
    <>
      {/* Ambient light (from liwords scene.ts line 387) */}
      <ambientLight color={0xffffff} intensity={1.2} />

      {/* Main directional light with shadows (from liwords line 390) */}
      <directionalLight
        color={0xffffff}
        intensity={0.5}
        position={[50, 100, 50]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001}
      />

      {/* Secondary directional light for fill (from liwords line 403) */}
      <directionalLight
        color={0xffffff}
        intensity={0.3}
        position={[-30, 50, -30]}
      />

      {/* Point light for warmth (from liwords line 407) */}
      <pointLight
        color={0xfff8e7}
        intensity={0.3}
        position={[0, 20, 30]}
      />
    </>
  );
};
