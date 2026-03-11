// HDR Environment setup (matching liwords exactly)

import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Same HDR as liwords (line 59)
const HDR_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr';

export const Environment: React.FC = () => {
  const { scene, gl } = useThree();

  useEffect(() => {
    // Set fallback background immediately
    scene.background = new THREE.Color(0x222222);

    // PMREMGenerator for proper reflections (from liwords line 412)
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    const rgbeLoader = new RGBELoader();

    rgbeLoader.load(
      HDR_URL,
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        scene.background = envMap;

        // Set background properties (from liwords line 426, 431)
        // @ts-ignore - these properties exist in r160+
        scene.backgroundBlurriness = 0.25;
        // @ts-ignore
        scene.backgroundIntensity = 0.5;

        texture.dispose();
        pmremGenerator.dispose();
      },
      undefined,
      (error) => {
        console.warn('Failed to load HDR environment:', error);
        // Keep fallback background
      }
    );

    // Cleanup
    return () => {
      if (scene.environment) {
        scene.environment.dispose();
      }
    };
  }, [scene, gl]);

  return null;
};
