import { z } from 'zod';

export const timingCueSchema = z.object({
  time: z.number().min(0).describe('Seconds into voiceover'),
  action: z.enum(['show_turn', 'play_tiles', 'play_tiles_with_zoom', 'exchange', 'end_rack', 'highlight', 'zoom', 'overview'])
    .describe('Animation action to perform'),
  turnIndex: z.number().int().min(0).optional()
    .describe('Which turn to show (for show_turn, play_tiles, highlight)'),
  playerIndex: z.number().int().min(0).max(1).optional()
    .describe('Which player is making this move (0 or 1). Source of truth from game history event.playerIndex. Required for play_tiles actions to properly animate the correct player\'s rack.'),
  targetSquare: z.object({
    row: z.number().int().min(0).max(14),
    col: z.number().int().min(0).max(14),
  }).optional().describe('Target square for zoom action'),
  cameraPosition: z.tuple([z.number(), z.number(), z.number()]).optional()
    .describe('Optional camera position override for zoom [x, y, z]. If not specified, uses default calculated position.'),
  duration: z.number().min(0).optional()
    .describe('How long to hold this state (seconds). Auto-calculated if not provided'),
  speed: z.number().positive().optional()
    .describe('Animation speed multiplier (default: 1.0). Lower values = slower animation. E.g., 0.1 for 10x slower'),
  zoomHeight: z.number().positive().optional()
    .describe('Camera Z height for play_tiles_with_zoom (default: 15)'),
});

export const timingScriptSchema = z.object({
  cues: z.array(timingCueSchema)
    .describe('Array of timing cues synchronized to voiceover timestamps'),
});

export type TimingCue = z.infer<typeof timingCueSchema>;
export type TimingScript = z.infer<typeof timingScriptSchema>;
