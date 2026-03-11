// Audio utilities for getting audio duration using mediabunny

import { getAudioDurationInSeconds } from '@remotion/media-utils';

/**
 * Get the duration of an audio file in seconds
 * Uses mediabunny internally for fast, accurate duration extraction
 */
export async function getAudioDuration(src: string): Promise<number> {
  try {
    const duration = await getAudioDurationInSeconds(src);
    return duration;
  } catch (error) {
    console.error('Failed to get audio duration:', error);
    throw new Error(`Could not determine duration for audio file: ${src}`);
  }
}

/**
 * Convert seconds to frames
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.floor(seconds * fps);
}

/**
 * Convert frames to seconds
 */
export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}
