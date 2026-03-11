import { z } from 'zod';
import { timingScriptSchema } from './timing-script.schema';

// Since we're using the compiled proto types which provide their own type safety,
// we can use a simpler schema here. The proto types handle the validation.
export const videoConfigSchema = z.object({
  gameHistory: z.any().describe('Game data from macondo protobuf (GameHistory type)'),
  voiceoverSrc: z.string().optional().describe('Path to voiceover audio file (MP3) - optional'),
  timingScript: timingScriptSchema.describe('Timing cues synchronized to voiceover'),
  tileColor: z.enum(['orange', 'yellow', 'pink', 'red', 'blue', 'black', 'white'])
    .default('orange')
    .describe('Tile color scheme (from liwords)'),
  boardColor: z.enum(['jade', 'teal', 'blue', 'purple', 'green', 'yellow', 'red', 'slate'])
    .default('jade')
    .describe('Board color scheme (from liwords)'),
  highlightMoves: z.array(z.number().int().min(0))
    .default([])
    .describe('Turn indices to highlight with extended analysis'),
});

export type VideoConfig = z.infer<typeof videoConfigSchema>;
