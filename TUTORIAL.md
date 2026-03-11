# Tutorial: Creating Your First Scrabble Analysis Video

## Overview

The system works in this flow:
```
GameHistory JSON → game-converter.ts → Board3DData states → BoardScene → Video
                                                    ↓
                                            Timing Script (when to show what)
```

## Step 1: Get Your Game Data

### From Woogles/Liwords:

1. Go to your game on Woogles
2. Export as GCG file
3. Convert to GameHistory JSON format

Or, get the GameHistory JSON directly from the API/export.

### Example GameHistory Structure:

```json
{
  "players": [
    { "nickname": "Alice", "real_name": "Alice Smith", "user_id": "1" },
    { "nickname": "Bob", "real_name": "Bob Jones", "user_id": "2" }
  ],
  "events": [
    {
      "nickname": "Alice",
      "note": "HELLO",           // Word played
      "rack": "HELLOXYZ",        // Tiles in rack after play
      "type": 0,                 // TILE_PLACEMENT_MOVE
      "cumulative": 18,          // Total score
      "row": 7,                  // 0-indexed row
      "column": 7,               // 0-indexed column
      "position": "8H",          // Human-readable position
      "played_tiles": "HELLO",   // Letters placed
      "score": 18,               // Points for this move
      "is_bingo": false
    },
    // ... more events
  ],
  "lexicon": "CSW21",
  "board_layout": "=  '   =   '  =\n -   \"   \"   - \n...", // Standard board
  // ... other metadata
}
```

## Step 2: Understand the Data Flow

### The Converter (`src/lib/game-converter.ts`):

```typescript
// Converts GameHistory to array of board states (one per turn)
const boardStates = convertGameHistoryToStates(gameHistory);

// Each state contains:
boardStates[0] = {
  tiles: [
    { letter: 'H', value: 4, row: 7, col: 7, isNew: true },
    { letter: 'E', value: 1, row: 7, col: 8, isNew: true },
    // ...
  ],
  players: [
    { nickname: 'Alice', score: 18, rack: ['X','Y','Z'], onturn: false },
    { nickname: 'Bob', score: 0, rack: [...], onturn: true }
  ],
  currentEvent: { /* details about what just happened */ },
  turnNumber: 1,
  lastMoveNotation: "8H HELLO"
}
```

## Step 3: Create a Timing Script

The timing script tells the video **when** to show each move.

### Recording Your Voiceover:

1. Open your game in a browser
2. Start recording audio (Audacity, QuickTime, etc.)
3. Narrate the game while noting timestamps:
   - "Let's start with move 1..." → note timestamp
   - "Alice plays HELLO for 18 points..." → note timestamp
   - "Now look at this square here..." → note timestamp

### Creating the Timing Script:

```json
{
  "cues": [
    {
      "time": 0.0,           // Seconds into voiceover
      "action": "overview"    // Show full board
    },
    {
      "time": 3.5,
      "action": "show_turn",
      "turnIndex": 0          // Show turn 1 (0-indexed)
    },
    {
      "time": 5.2,
      "action": "play_tiles",
      "turnIndex": 0          // Animate tiles for turn 1
    },
    {
      "time": 8.0,
      "action": "zoom",
      "targetSquare": { "row": 7, "col": 7 }  // Zoom to H8
    },
    {
      "time": 12.0,
      "action": "overview"    // Back to full view
    },
    {
      "time": 14.0,
      "action": "show_turn",
      "turnIndex": 1
    },
    {
      "time": 16.0,
      "action": "play_tiles",
      "turnIndex": 1
    },
    {
      "time": 20.0,
      "action": "highlight",  // Glow effect on tiles
      "turnIndex": 1
    }
  ]
}
```

### Available Actions:

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `overview` | Wide shot of full board | - |
| `show_turn` | Display turn number indicator | `turnIndex` |
| `play_tiles` | Animate tiles from rack to board | `turnIndex` |
| `zoom` | Zoom camera to specific square | `targetSquare: {row, col}` |
| `highlight` | Show glow effect on tiles | `turnIndex` |

## Step 4: Put It Together

### Option A: Using Root.tsx (for testing)

Edit `src/Root.tsx`:

```typescript
import myGameHistory from './my-game.json';
import myTimingScript from './my-timing.json';

// In defaultProps:
defaultProps: {
  gameHistory: myGameHistory,
  voiceoverSrc: "/my-voiceover.mp3",  // Put in public/
  timingScript: myTimingScript,
  tileColor: "orange",
  boardColor: "jade",
  highlightMoves: [3, 7, 12]  // Turn indices to highlight
}
```

### Option B: Using CLI (for production)

Create `video-config.json`:
```json
{
  "gameHistory": { /* your game data */ },
  "voiceoverSrc": "/voiceover.mp3",
  "timingScript": { /* your timing cues */ },
  "tileColor": "orange",
  "boardColor": "jade"
}
```

Render:
```bash
npx remotion render GameAnalysis output.mp4 \\
  --props='@video-config.json'
```

## Step 5: Workflow Example

Let's say you want to create a video for a game:

### 1. Export the game data:
```bash
# Save game as game.json
cp exported-game.json src/my-game.json
```

### 2. Record voiceover:
```bash
# Record while looking at the game
# Note timestamps:
# 0:00 - "Welcome to this game..."
# 0:05 - "Move 1, Alice plays HELLO"
# 0:12 - "Notice the H is on a double letter"
# etc.

# Save as public/my-voiceover.mp3
```

### 3. Create timing script:
```json
{
  "cues": [
    { "time": 0, "action": "overview" },
    { "time": 5, "action": "show_turn", "turnIndex": 0 },
    { "time": 7, "action": "play_tiles", "turnIndex": 0 },
    { "time": 12, "action": "zoom", "targetSquare": {"row": 7, "col": 7} },
    // ... etc
  ]
}
```

Save as `src/my-timing.json`

### 4. Update Root.tsx:
```typescript
import myGame from './my-game.json';
import myTiming from './my-timing.json';

defaultProps: {
  gameHistory: myGame,
  voiceoverSrc: "/my-voiceover.mp3",
  timingScript: myTiming,
  // ...
}
```

### 5. Preview in Studio:
```bash
npm run dev
```
Open http://localhost:3000, scrub timeline, adjust timing.

### 6. Render final video:
```bash
npx remotion render GameAnalysis my-video.mp4
```

## Understanding Tile Animations

When you use `play_tiles` action:

```typescript
// BoardScene automatically:
1. Reads currentBoardState.tiles
2. Filters for tiles where isNew: true
3. For each new tile:
   - Starts at rack position (calculated from index)
   - Animates to board position (calculated from row/col)
   - Uses spring physics for smooth arc
   - Staggers animation (8 frames between tiles)
```

You don't need to manually specify which tiles animate - the system knows based on the GameHistory!

## Debugging Tips

### Tiles not showing up?
- Check that `board_layout` is exactly 15x15
- Verify row/col indices are 0-14
- Check that `played_tiles` format matches GameHistory spec

### Timing off?
- Use Remotion Studio scrubber to find exact frames
- Adjust timing script cues by 0.5-1.0 second increments
- Remember: time is in seconds, not frames

### Camera not moving?
- Ensure timing cues are in chronological order
- Check targetSquare coordinates are valid (0-14)
- Verify you have both position AND lookAt in keyframes

## Advanced: Multiple Games

To create videos for multiple games:

```bash
# Structure:
games/
  game1/
    game.json
    timing.json
    voiceover.mp3
  game2/
    game.json
    timing.json
    voiceover.mp3

# Script to render all:
for dir in games/*/; do
  npx remotion render GameAnalysis "${dir}output.mp4" \\
    --props="{gameHistory: $(cat ${dir}game.json), ...}"
done
```

## Next Steps

1. Try with the sample data first
2. Export a real game you've played
3. Record a quick voiceover (don't worry about perfection)
4. Create a simple timing script
5. Render and iterate!

The key is to start simple and gradually add more sophisticated timing and camera work.
