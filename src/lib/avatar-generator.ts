import { AvatarTraits } from '../types/avatar';

// Predefined configurations for known players
const KNOWN_PLAYERS: Record<string, AvatarTraits> = {
  cesar: {
    skinTone: 'warm',
    glasses: true,
    beard: true,
    hat: { type: 'none', color: '' },
    faceShape: 'oval',
    shirtColor: '#4A90E2',
    hair: { type: 'short', color: '#2C1810' }, // Dark brown/black
    gender: 'male',
  },
  wordswithfrentz: {
    skinTone: 'light',
    glasses: true,
    beard: false,
    hat: { type: 'cap', color: 'black' },
    faceShape: 'round',
    shirtColor: '#E74C3C',
    hair: { type: 'short', color: '#8B4513' }, // Not visible due to hat
    gender: 'male',
  },
};

// Skin tone color mappings
export const SKIN_TONES: Record<AvatarTraits['skinTone'], string> = {
  light: '#FFD7BA',
  fair: '#F4C0A8',      // Between light and medium
  medium: '#E8B896',
  warm: '#F0C4A6',      // Subtly warmer than fair
  tan: '#D4A574',
  dark: '#B8845C',
  deep: '#8B5A3C',
};

// Face dimensions based on face shape
export const FACE_DIMENSIONS: Record<AvatarTraits['faceShape'], { width: number; height: number }> = {
  narrow: { width: 45, height: 55 },
  oval: { width: 50, height: 60 },
  round: { width: 55, height: 58 },
};

// Simple hash function for deterministic trait generation
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Infer gender from nickname (simple heuristic)
function inferGender(nickname: string): AvatarTraits['gender'] {
  const lower = nickname.toLowerCase();
  const femaleIndicators = ['she', 'her', 'girl', 'woman', 'lady', 'miss', 'ms', 'mrs'];
  const maleIndicators = ['he', 'him', 'boy', 'man', 'mr', 'sir'];

  for (const indicator of femaleIndicators) {
    if (lower.includes(indicator)) return 'female';
  }
  for (const indicator of maleIndicators) {
    if (lower.includes(indicator)) return 'male';
  }

  // Default to neutral
  return 'neutral';
}

// Generate traits from nickname hash
function generateTraitsFromHash(nickname: string): AvatarTraits {
  const hash = hashString(nickname);

  const skinTones: AvatarTraits['skinTone'][] = ['light', 'fair', 'medium', 'warm', 'tan', 'dark', 'deep'];
  const faceShapes: AvatarTraits['faceShape'][] = ['narrow', 'oval', 'round'];
  const hatTypes: AvatarTraits['hat']['type'][] = ['none', 'cap', 'beanie', 'cowboy', 'fedora'];
  const hatColors = ['black', 'red', 'blue', 'green', 'brown'];
  const shirtColors = ['#4A90E2', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#3498DB'];
  const hairColors = ['#2C1810', '#8B4513', '#D2691E', '#FFD700', '#FF6347', '#C0C0C0'];

  const gender = inferGender(nickname);

  // Determine hair type based on gender
  let hairType: AvatarTraits['hair']['type'];
  if (gender === 'female') {
    // Women get long or wavy hair
    hairType = (hash >> 28) % 2 === 0 ? 'long' : 'wavy';
  } else {
    // Men and neutral get short, curly, or bald
    const maleHairTypes: AvatarTraits['hair']['type'][] = ['short', 'curly', 'bald'];
    hairType = maleHairTypes[(hash >> 28) % maleHairTypes.length];
  }

  return {
    skinTone: skinTones[hash % skinTones.length],
    glasses: (hash >> 8) % 2 === 0,
    beard: gender === 'male' && (hash >> 16) % 2 === 0, // Only males get beards
    hat: {
      type: hatTypes[(hash >> 24) % hatTypes.length],
      color: hatColors[(hash >> 4) % hatColors.length],
    },
    faceShape: faceShapes[(hash >> 12) % faceShapes.length],
    shirtColor: shirtColors[(hash >> 20) % shirtColors.length],
    hair: {
      type: hairType,
      color: hairColors[(hash >> 6) % hairColors.length],
    },
    gender,
  };
}

// Get traits for a player (predefined or generated)
export function getPlayerTraits(nickname: string): AvatarTraits {
  const normalizedNickname = nickname.toLowerCase();
  return KNOWN_PLAYERS[normalizedNickname] || generateTraitsFromHash(nickname);
}
