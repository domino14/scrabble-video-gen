// Traits for face generation
export interface AvatarTraits {
  skinTone: 'light' | 'medium' | 'tan' | 'dark' | 'deep';
  glasses: boolean;
  beard: boolean;
  hat: { type: 'none' | 'cap' | 'beanie' | 'cowboy' | 'fedora'; color: string };
  faceShape: 'narrow' | 'oval' | 'round';  // Affects face dimensions
  shirtColor: string;
  hair: { type: 'short' | 'long' | 'curly' | 'wavy' | 'bald'; color: string };
  gender: 'male' | 'female' | 'neutral';
}

// Expression states
export type ExpressionType = 'idle' | 'happy' | 'sad' | 'frustrated' | 'angry';

export interface ExpressionState {
  type: ExpressionType;
  intensity: number;      // 0-1 for blending
  startFrame: number;
}
