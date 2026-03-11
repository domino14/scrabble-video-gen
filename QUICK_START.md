# Quick Start Guide

Get your first Scrabble analysis video rendering in 5 minutes!

## Step 1: Verify Setup (30 seconds)

```bash
node verify-setup.js
```

You should see all green checkmarks ✅

## Step 2: Start Remotion Studio (30 seconds)

```bash
npm run dev
```

Opens at http://localhost:3000

## Step 3: Preview the Sample Video (1 minute)

1. In Remotion Studio, you'll see "GameAnalysis" composition
2. Click play to preview
3. Scrub the timeline to see different scenes:
   - 0-5s: Intro scene
   - 5s+: Main board with animations

## Step 4: Customize (2 minutes)

Edit `src/Root.tsx` to change:

### Game Data
Replace `sampleGameHistory` with your game:
```typescript
const myGameHistory = {
  // Your GameHistory JSON here
};
```

### Timing Script
Replace `sampleTimingScript` with your timing:
```typescript
const myTimingScript = {
  cues: [
    { time: 0, action: "overview" },
    { time: 2, action: "show_turn", turnIndex: 0 },
    { time: 3, action: "play_tiles", turnIndex: 0 },
    // Add more cues...
  ]
};
```

### Colors
```typescript
defaultProps: {
  tileColor: "orange", // orange, yellow, pink, red, blue, black, white
  boardColor: "jade",  // jade, walnut, maple, oak
}
```

## Step 5: Render Your Video (1 minute)

```bash
npx remotion render GameAnalysis output.mp4
```

Your video will be saved as `output.mp4`!

## Using Real Game Data

### From Woogles/Liwords

1. Export game as GCG
2. Convert to GameHistory JSON using protojson
3. Save as `my-game.json`

### Add Voiceover

1. Record your commentary as MP3
2. Save to `public/voiceover.mp3`
3. Update `voiceoverSrc` in Root.tsx:
   ```typescript
   voiceoverSrc: "/voiceover.mp3"
   ```

### Create Timing Script

While listening to your voiceover, note timestamps:

```json
{
  "cues": [
    { "time": 0, "action": "overview" },
    { "time": 3.5, "action": "show_turn", "turnIndex": 0 },
    { "time": 5.2, "action": "play_tiles", "turnIndex": 0 }
  ]
}
```

## Action Types

- **overview** - Wide shot of board
- **show_turn** - Display turn number (requires `turnIndex`)
- **play_tiles** - Animate tiles (requires `turnIndex`)
- **zoom** - Zoom to square (requires `targetSquare`)
- **highlight** - Glow effect (requires `turnIndex`)

## Example: Full Video Props

```typescript
{
  gameHistory: myGameHistory,
  voiceoverSrc: "/my-voiceover.mp3",
  timingScript: myTimingScript,
  tileColor: "orange",
  boardColor: "jade",
  highlightMoves: [3, 7, 12] // Turn indices to highlight
}
```

## Rendering Options

### Draft Quality (Fast)
```bash
npx remotion render GameAnalysis output.mp4 --scale=0.5
```

### Full Quality (Best)
```bash
npx remotion render GameAnalysis output.mp4 --quality=90
```

### Custom Range
```bash
npx remotion render GameAnalysis output.mp4 --frames=0-300
```

## Troubleshooting

### "Audio file not found"
- Put audio files in `public/` directory
- Use relative path: `/voiceover.mp3`

### "Tiles not appearing"
- Check board_layout format (15x15 grid)
- Verify row/col values (0-14)
- Check position format (e.g., "8H")

### "Camera not moving"
- Ensure timing cues are in chronological order
- Check targetSquare coordinates are valid (0-14)

## Sample Files Included

- `sample-game.json` - Example game data
- `sample-timing-script.json` - Example timing cues

Use these to test the system before adding your own data.

## Next Steps

1. Test with sample data ✅
2. Export your game from Woogles
3. Record voiceover commentary
4. Create timing script
5. Render and upload to YouTube!

## Tips

- Preview in Remotion Studio before rendering
- Use zoom sparingly for dramatic effect
- Highlight bingos and interesting moves
- Keep commentary concise and engaging

## Need Help?

- Check README.md for full documentation
- See IMPLEMENTATION_SUMMARY.md for architecture details
- Review example code in `src/` directory

Happy video making! 🎬
