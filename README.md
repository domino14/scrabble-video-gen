# Scrabble Game Analysis Video System

A Remotion-based video production system for creating YouTube Scrabble game analysis videos with 3D board animations and voiceover narration.

## Features

- **3D Board Rendering**: Beautiful Three.js-based board with procedural textures
- **Audio-Driven Animations**: Tile movements sync to voiceover timestamps
- **Dynamic Camera**: Smooth camera movements with zoom and pan
- **Professional Overlays**: Scorecard, move notation, and turn indicators
- **Flexible Styling**: Customizable tile and board colors
- **High Quality**: 1080p 30fps output for YouTube

## Quick Start

### 1. Installation

Dependencies are already installed. To verify setup:

```bash
node verify-setup.js
```

### 2. Preview in Remotion Studio

```bash
npm run dev
```

This opens the Remotion Studio at http://localhost:3000 where you can:
- Preview the video composition
- Scrub through the timeline
- Edit props in real-time
- Test animations

### 3. Render a Video

```bash
npx remotion render GameAnalysis output.mp4
```

## Creating Your First Video

### Step 1: Prepare Your Game Data

Export your game from Woogles/liwords as a GameHistory JSON file. Example format:

```json
{
  "players": [
    { "nickname": "Player1", "real_name": "Alice", "user_id": "1" },
    { "nickname": "Player2", "real_name": "Bob", "user_id": "2" }
  ],
  "events": [
    {
      "nickname": "Player1",
      "note": "HELLO",
      "rack": "HELLOXYZ",
      "type": 0,
      "cumulative": 18,
      "row": 7,
      "column": 7,
      "position": "8H",
      "played_tiles": "HELLO",
      "score": 18,
      "is_bingo": false
    }
  ],
  "lexicon": "CSW21",
  "board_layout": "=..'..\\"...'..=\\n..."
}
```

### Step 2: Record Your Voiceover

Record your game analysis as an MP3 file. While recording, note timestamps for key moments.

### Step 3: Create a Timing Script

Create a JSON file mapping your commentary to animations:

```json
{
  "cues": [
    { "time": 0, "action": "overview" },
    { "time": 3.5, "action": "show_turn", "turnIndex": 0 },
    { "time": 5.2, "action": "play_tiles", "turnIndex": 0 },
    { "time": 8.0, "action": "zoom", "targetSquare": { "row": 7, "col": 7 } },
    { "time": 12.0, "action": "show_turn", "turnIndex": 1 },
    { "time": 14.5, "action": "play_tiles", "turnIndex": 1 }
  ]
}
```

**Available Actions:**
- `overview` - Wide view of entire board
- `show_turn` - Display turn number indicator
- `play_tiles` - Animate tiles from rack to board
- `zoom` - Zoom camera to specific square
- `highlight` - Show glow effect on tiles

### Step 4: Render Your Video

```bash
npx remotion render GameAnalysis output.mp4 \\
  --props='{"gameHistory": {...}, "voiceoverSrc": "/voiceover.mp3", "timingScript": {...}}'
```

Or edit `src/Root.tsx` to set your props as defaults.

## Project Structure

```
src/
├── types/
│   ├── game-history.ts          # GameHistory type definitions
│   └── board-3d-data.ts         # 3D board data structures
├── schemas/
│   ├── video-config.schema.ts   # Video configuration schema
│   └── timing-script.schema.ts  # Timing cue schema
├── lib/
│   ├── game-converter.ts        # Convert GameHistory to board states
│   ├── procedural-textures.ts   # Noise functions for materials
│   ├── board-coordinates.ts     # Position calculations
│   ├── animation-utils.ts       # Animation helpers
│   └── audio-utils.ts           # Audio duration utilities
├── components/
│   ├── three/                   # 3D components
│   │   ├── ScrabbleBoard.tsx
│   │   ├── Tile.tsx
│   │   ├── TileAnimated.tsx
│   │   └── ...
│   ├── overlays/                # HTML overlays
│   │   ├── Scorecard.tsx
│   │   ├── MoveNotation.tsx
│   │   └── TurnIndicator.tsx
│   └── effects/                 # Visual effects
│       ├── TileGlow.tsx
│       └── TilePlacementSound.tsx
├── scenes/
│   ├── IntroScene.tsx           # Opening scene
│   ├── BoardScene.tsx           # Main game scene
│   ├── HighlightMoment.tsx      # Analysis overlay
│   └── OutroScene.tsx           # Final scores
├── compositions/
│   └── GameAnalysisVideo.tsx    # Main composition
└── Root.tsx                     # Remotion configuration
```

## Customization

### Tile Colors

Available tile colors: `orange`, `yellow`, `pink`, `red`, `blue`, `black`, `white`

```typescript
tileColor: "orange"
```

### Board Colors

Available board colors: `jade`, `walnut`, `maple`, `oak`

```typescript
boardColor: "jade"
```

### Camera Movements

Camera movements are defined by timing cues:

```json
{
  "time": 8.0,
  "action": "zoom",
  "targetSquare": { "row": 7, "col": 7 }
}
```

### Animation Timing

Adjust animation parameters in `src/lib/animation-utils.ts`:

```typescript
export const DEFAULT_SPRING: SpringConfig = {
  damping: 12,
  stiffness: 100,
  mass: 0.8,
};
```

## Tips for Great Videos

1. **Plan Your Commentary**: Write a script before recording to keep it tight
2. **Note Timestamps**: Mark key moments while recording your voiceover
3. **Use Zoom Strategically**: Zoom in on interesting moves or mistakes
4. **Highlight Bingos**: The system automatically celebrates bingos with special effects
5. **Preview Before Rendering**: Use Remotion Studio to fine-tune timing

## Timing Script Creation Workflow

1. Record your voiceover while looking at the game
2. Play it back and note timestamps for:
   - When you start discussing each turn
   - When tiles should animate onto the board
   - When to zoom in on interesting squares
3. Create the timing script JSON
4. Preview in Remotion Studio
5. Adjust timings as needed

## Rendering Options

### Quick Preview (Draft Quality)
```bash
npx remotion render GameAnalysis preview.mp4 --scale=0.5
```

### Full Quality (1080p)
```bash
npx remotion render GameAnalysis output.mp4 --quality=90
```

### Custom Frame Range
```bash
npx remotion render GameAnalysis output.mp4 --frames=0-300
```

## Troubleshooting

### Audio Not Playing
- Ensure the audio file path is correct
- Use absolute paths or paths relative to `public/`
- Supported formats: MP3, WAV

### Tiles Not Appearing
- Check that `board_layout` matches standard Scrabble format (15x15 grid)
- Verify row/column indices are 0-14
- Check that `played_tiles` format is correct

### Camera Not Moving
- Ensure timing cues have correct frame numbers
- Check that targetSquare coordinates are valid
- Verify camera keyframes are in chronological order

## Performance

- Rendering time: ~1-2 minutes per minute of video (on M1 Mac)
- Memory usage: ~2GB for typical game
- Preview is real-time in Remotion Studio

## Next Steps

- Add custom fonts for better typography
- Include audio sound effects (tile clicks, bingo celebrations)
- Add presenter video cutaway support
- Implement automated mistake analysis integration
- Create templates for different game types

## License

MIT License

## Credits

Built with:
- [Remotion](https://www.remotion.dev/) - Video creation framework
- [Three.js](https://threejs.org/) - 3D graphics
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js

Board rendering inspired by [Woogles.io](https://woogles.io/) liwords board3d implementation.
