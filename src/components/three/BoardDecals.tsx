// Board decals (W logo and optional custom logo)

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface BoardDecalsProps {
  boardThickness?: number;
  showLogos?: boolean;
}

export const BoardDecals: React.FC<BoardDecalsProps> = ({
  boardThickness = 2,
  showLogos = true,
}) => {
  const z = boardThickness / 2 + 0.05;
  const size = 14; // Decal square size in scene units

  // Create W logo texture
  const wTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Blue rounded-rect background
    const pad = 18;
    const cr = 26;
    const sw = 256 - pad * 2;
    const sh = 256 - pad * 2;
    ctx.fillStyle = '#1a5fa8';
    ctx.beginPath();
    ctx.moveTo(pad + cr, pad);
    ctx.lineTo(pad + sw - cr, pad);
    ctx.quadraticCurveTo(pad + sw, pad, pad + sw, pad + cr);
    ctx.lineTo(pad + sw, pad + sh - cr);
    ctx.quadraticCurveTo(pad + sw, pad + sh, pad + sw - cr, pad + sh);
    ctx.lineTo(pad + cr, pad + sh);
    ctx.quadraticCurveTo(pad, pad + sh, pad, pad + sh - cr);
    ctx.lineTo(pad, pad + cr);
    ctx.quadraticCurveTo(pad, pad, pad + cr, pad);
    ctx.closePath();
    ctx.fill();

    // Bold W, rotated -11°
    ctx.save();
    ctx.translate(128, 136);
    ctx.rotate((-11 * Math.PI) / 180);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 155px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', 0, 0);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  if (!showLogos) {
    return null;
  }

  return (
    <>
      {/* W logo on right side */}
      <mesh position={[47, 0, z]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={wTexture}
          transparent={true}
          toneMapped={false}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </>
  );
};
