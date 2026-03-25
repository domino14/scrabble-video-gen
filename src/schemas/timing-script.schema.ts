import { z } from 'zod';

export const timingCueSchema = z.object({
  time: z.number().min(0).describe('Seconds into voiceover'),
  action: z.enum(['show_turn', 'play_tiles', 'play_tiles_with_zoom', 'exchange', 'end_rack', 'highlight', 'zoom', 'overview', 'show_variation', 'highlight_region'])
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
  variation: z.object({
    position: z.string().describe('Board position in Scrabble notation, e.g. "8H" (horizontal) or "H8" (vertical)'),
    word: z.string().describe('The word to display, e.g. "QUIXOTIC". Use "." for through-tiles, lowercase for blanks (e.g. "DUbT")'),
  }).optional().describe('Variation move to display as ghost tiles (used with show_variation action)'),
  variationStyle: z.object({
    tileColor: z.string().optional().describe('Hex color for ghost tile body, e.g. "#6688aa"'),
    textColor: z.string().optional().describe('Hex color for ghost tile letter text, e.g. "#ffffff"'),
  }).optional().describe('Override default ghost tile styling for this variation'),
  highlightRegion: z.object({
    startRow: z.number().int().min(0).max(14),
    startCol: z.number().int().min(0).max(14),
    endRow: z.number().int().min(0).max(14),
    endCol: z.number().int().min(0).max(14),
  }).optional().describe('Board region to highlight as a rectangle (row/col 0-14, inclusive). Used with highlight_region action'),
});

export const timingScriptSchema = z.object({
  cues: z.array(timingCueSchema)
    .describe('Array of timing cues synchronized to voiceover timestamps'),
});

export type TimingCue = z.infer<typeof timingCueSchema>;
export type TimingScript = z.infer<typeof timingScriptSchema>;
