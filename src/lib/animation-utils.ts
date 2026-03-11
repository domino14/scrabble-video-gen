// Animation utilities for Remotion

import { interpolate, spring, SpringConfig } from 'remotion';

/**
 * Default spring configuration for natural movement
 */
export const DEFAULT_SPRING: SpringConfig = {
  damping: 12,
  stiffness: 100,
  mass: 0.8,
};

/**
 * Spring configuration for snappy animations
 */
export const SNAPPY_SPRING: SpringConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

/**
 * Spring configuration for slow, smooth animations
 */
export const SMOOTH_SPRING: SpringConfig = {
  damping: 20,
  stiffness: 50,
  mass: 1.5,
};

/**
 * Create an arc trajectory for tile movement
 * Returns the z-offset (height above base trajectory)
 */
export function createArcTrajectory(progress: number, arcHeight: number = 15): number {
  // Parabolic arc: peaks at 0.5 progress
  return arcHeight * Math.sin(progress * Math.PI);
}

/**
 * Interpolate with easing function
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Interpolate with ease-in function
 */
export function easeIn(t: number): number {
  return t * t;
}

/**
 * Interpolate with ease-out function
 */
export function easeOut(t: number): number {
  return t * (2 - t);
}

/**
 * Create a staggered animation delay
 */
export function getStaggerDelay(index: number, staggerFrames: number = 8): number {
  return index * staggerFrames;
}

/**
 * Get spring animation progress with delay
 */
export function getSpringProgress(
  frame: number,
  fps: number,
  delay: number = 0,
  config: SpringConfig = DEFAULT_SPRING
): number {
  return spring({
    frame: frame - delay,
    fps,
    config,
  });
}

/**
 * Interpolate between two angles taking the shortest path
 */
export function interpolateAngle(
  angle1: number,
  angle2: number,
  progress: number
): number {
  const diff = ((angle2 - angle1 + 180) % 360) - 180;
  return angle1 + diff * progress;
}

/**
 * Pulse animation (for glow effects)
 */
export function pulse(frame: number, fps: number, frequency: number = 1): number {
  return (Math.sin((frame / fps) * Math.PI * 2 * frequency) + 1) / 2;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
