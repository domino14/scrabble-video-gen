// Procedural texture generation for normal maps
// Ported from liwords board3d/scene.ts

import * as THREE from 'three';

// 2D value noise
export function vnoise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const hash = (n: number) => {
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = (n >> 16) ^ n;
    return n / 0x7fffffff;
  };

  const h00 = hash(ix + iy * 57);
  const h10 = hash(ix + 1 + iy * 57);
  const h01 = hash(ix + (iy + 1) * 57);
  const h11 = hash(ix + 1 + (iy + 1) * 57);

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  return h00 * (1 - u) * (1 - v) +
         h10 * u * (1 - v) +
         h01 * (1 - u) * v +
         h11 * u * v;
}

// 2D simplex noise
export function snoise2(x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);

  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;

  let i1, j1;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  };

  const hash = (n: number) => {
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    return (n >> 16) ^ n;
  };

  let n0, n1, n2;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 < 0) {
    n0 = 0;
  } else {
    t0 *= t0;
    n0 = t0 * t0 * grad(hash(i + hash(j)), x0, y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 < 0) {
    n1 = 0;
  } else {
    t1 *= t1;
    n1 = t1 * t1 * grad(hash(i + i1 + hash(j + j1)), x1, y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 < 0) {
    n2 = 0;
  } else {
    t2 *= t2;
    n2 = t2 * t2 * grad(hash(i + 1 + hash(j + 1)), x2, y2);
  }

  return 70 * (n0 + n1 + n2);
}

// Fractional Brownian Motion
export function fbm2(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * snoise2(x * frequency, y * frequency);
    frequency *= 2;
    amplitude *= 0.5;
  }

  return value;
}

// Tile height function
export function tileHeightAt(x: number, y: number): number {
  const scale = 3;
  return fbm2(x * scale, y * scale, 3) * 0.3 + 0.5;
}

// Board height function (for circular board base)
export function boardHeightAt(x: number, y: number): number {
  const scale = 2;
  return fbm2(x * scale, y * scale, 4) * 0.2 + 0.5;
}

// Wood grain height function
export function woodHeightAt(x: number, y: number): number {
  const scale = 0.5;
  const grain = Math.sin(x * 10 + fbm2(x * scale, y * scale, 3) * 5) * 0.5 + 0.5;
  return grain * 0.7 + vnoise2(x * 5, y * 5) * 0.3;
}

// Generate normal map texture from height function (matching liwords line 122)
export function makeNormalMap(
  heightFn: (u: number, v: number) => number,
  size: number,
  strength: number
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const eps = 1 / size;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const u = col / size;
      const v = row / size;
      const h = heightFn(u, v);
      const hx = heightFn(u + eps, v);
      const hy = heightFn(u, v + eps);

      // Finite-difference gradient → un-normalised tangent-space normal
      let nx = (h - hx) * strength;
      let ny = (h - hy) * strength;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (row * size + col) * 4;
      data[i] = ((nx * 0.5 + 0.5) * 255) | 0;
      data[i + 1] = ((ny * 0.5 + 0.5) * 255) | 0;
      data[i + 2] = ((nz * 0.5 + 0.5) * 255) | 0;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}
