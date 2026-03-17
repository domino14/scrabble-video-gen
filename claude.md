# Scrabble Video Generator

A professional broadcast-quality video generator for Scrabble games, built with Remotion and React. Creates OBS-style layouts with animated 3D board views, player racks, and generative avatar system.

## Overview

This project transforms Scrabble game data (GCG format) into polished video content suitable for streaming or YouTube. It features:

- **3D Board Visualization**: Isometric view with animated tile placement
- **Broadcast Layout**: Professional OBS-style multi-camera setup
- **Player Avatars**: Generative Mii-style animated faces with expressions
- **Real-time Animations**: Tile animations, rack management, score counting
- **Expression System**: Avatars react to game events (bingos, high scores)

## Architecture

### Core Animation System

All animations are **pure functions of `currentFrame`** from Remotion:

```
currentFrame (from Remotion)
    ↓
BroadcastScene → derives expressions from timing script
    ↓
PlayerAvatarWidget → renders based on props
    ↓
Pure functions: blink, bob, expressions
```

**No React state, no useEffect, no race conditions.** Everything is deterministic and scrubable.

### Key Components

#### 1. Avatar System (`src/components/overlays/PlayerAvatarWidget.tsx`)

**Three independent animation types:**

- **Blink**: Seeded random per player (different timing for each player)
- **Bob**: Sinusoidal vertical movement (smooth idle animation)
- **Expressions**: Event-driven reactions to game plays

**Avatar Features:**
- Gender-based styling (oval eyes for women, round for men, thinner eyebrows)
- 7 skin tones: light, fair, medium, warm, tan, dark, deep
- 5 hair types: short, long, curly, wavy, bald
- Accessories: glasses, beards, hats (cap, beanie, cowboy, fedora)
- Shirts with collars
- Expression states: idle, happy, sad, frustrated, angry

**Trait Generation:**
- Predefined configs for known players
- Hash-based deterministic generation for unknown players
- Gender inference from nicknames

#### 2. Expression System (`src/scenes/BroadcastScene.tsx`)

Expressions are **derived** from timing script + current time:

```typescript
// Find plays within last 2 seconds
const recentPlays = timingScript.cues.filter(cue => {
  const timeSinceCue = currentTimeSeconds - cue.time;
  return timeSinceCue >= 0 && timeSinceCue <= 2;
});

// Trigger expressions based on score
if (event.isBingo || event.score >= 50) {
  // Scoring player: happy
  // Opponent: angry (60+ points) or sad (50-59 points)
}

// Fade in/out timing
intensity = calculateFade(timeSincePlay, fadeIn, hold, fadeOut);
```

**No state needed** - recalculated every frame based on:
- Current time (`currentFrame / fps`)
- Timing script (which cues have happened)
- Board states (what scores were)

#### 3. Timing Script (`src/schemas/timing-script.schema`)

The **source of truth** for when things happen:

```typescript
{
  time: 45.2,           // When this happens
  action: 'play_tiles', // What happens
  turnIndex: 3,         // Which turn
  playerIndex: 0,       // Which player
  speed: 1.0            // Animation speed
}
```

All game events reference the timing script. The system checks:
- "Did a play happen recently?" → Check timing script
- "What was the score?" → Look up board state at that turn
- "Should we show expressions?" → Derive from both

### Broadcast Layout

**Three-camera setup:**
1. **Center**: Main board view (1030×900px)
2. **Bottom Left**: Player 1 rack + avatar (480×170px rack + 255×255px avatar)
3. **Bottom Right**: Player 2 rack + avatar (480×170px rack + 255×255px avatar)

**Overlays:**
- Remaining tiles widget (top left)
- Game info (top right)
- Score widgets (above racks, animated count-up)
- Move notation (bottom center, appears on plays)
- Avatar cameras (in light gray bordered containers)

### Rack State Management

**Per-player rack lookup** ensures correct display:

```typescript
// During animation for THIS player: use the animation cue's state
// Not animating or different player: show rack from their NEXT upcoming turn
// No upcoming turns: show POST-PLAY rack (with played tiles removed)
```

This prevents the "blinking rack" issue and ensures each player's rack shows the correct tiles at the correct time.

## Project Structure

```
src/
├── components/
│   ├── overlays/          # 2D UI overlays
│   │   ├── PlayerAvatarWidget.tsx      # Generative avatars
│   │   ├── BroadcastLayout.tsx         # Main layout coordinator
│   │   ├── BroadcastScoreWidget.tsx    # Animated score displays
│   │   ├── MoveNotation.tsx            # Move notation display
│   │   └── ...
│   └── three/             # 3D components
│       ├── BroadcastBoardView.tsx      # Main board view
│       ├── AnimatedRackTile.tsx        # Tile animations
│       └── ...
├── scenes/
│   └── BroadcastScene.tsx              # Main scene component
├── lib/
│   ├── avatar-generator.ts             # Avatar trait generation
│   ├── board-coordinates.ts            # 3D positioning
│   └── ...
├── types/
│   ├── avatar.ts                       # Avatar type definitions
│   └── ...
└── schemas/
    └── timing-script.schema.ts         # Timing script schema
```

## Development

### Setup

```bash
npm install
```

### Running

```bash
npm start
```

Then navigate to `http://localhost:3000` to see the Remotion Studio.

## Rendering

### macOS

```bash
npx remotion render GameAnalysis --gl=angle
```

### Linux (Mesa/Intel GPU — recommended)

This machine has dual GPU (Intel UHD 770 + NVIDIA RTX 3070 Ti). The NVIDIA card
does not work with Chrome headless due to a `BindToCurrentSequence` bug in Chromium's
PRIME Optimus mode. Use the Intel GPU via Mesa instead — same quality, ~8.5 min render.

**Prerequisites:**
1. Install system Chromium: `sudo pacman -S chromium`
2. Run `npm install` — the `postinstall` script automatically applies
   `patches/@remotion+renderer+4.0.434.patch` via `patch-package`, which adds the
   `angle` renderer case to `@remotion/renderer`. This forces ANGLE to use native
   OpenGL instead of Vulkan (NVIDIA driver lacks `VK_EXT_headless_surface`).

**Render command:**
```bash
DISPLAY=:1 XAUTHORITY=$(ls /run/user/1000/xauth_*) __GLX_VENDOR_LIBRARY_NAME=mesa DRI_PRIME=0 \
  npx remotion render GameAnalysis --gl=angle --browser-executable=$(which chromium) --concurrency=1
```

> `XAUTHORITY` is needed so Chromium can authenticate to X display `:1` (the path changes each session, hence the subshell). `XDG_RUNTIME_DIR` is not needed.

### Linux fallback (software rendering — may have artifacts)

```bash
npx remotion render GameAnalysis --gl=swangle
```

### Key Concepts

**1. Everything is a pure function of `currentFrame`**
- No React state for animations
- Scrubbing works perfectly
- Deterministic rendering

**2. Timing script is the source of truth**
- All game events reference it
- Expressions derived from it
- Animations synced to it

**3. Avatar independence**
- Each player has different blink timing (seeded random)
- Bob animations use same sine wave but different player seeds could be added
- Expressions passed as props, not derived internally

**4. Board state immutability**
- Each turn has its own board state
- States are never modified
- Enables time-travel debugging

## Avatar Customization

### Predefined Players

Edit `src/lib/avatar-generator.ts`:

```typescript
const KNOWN_PLAYERS: Record<string, AvatarTraits> = {
  yourname: {
    skinTone: 'warm',
    glasses: true,
    beard: true,
    hat: { type: 'none', color: '' },
    faceShape: 'oval',
    shirtColor: '#4A90E2',
    hair: { type: 'short', color: '#2C1810' },
    gender: 'male',
  },
};
```

### Expression Triggers

Edit `src/scenes/BroadcastScene.tsx` in the `usePlayerExpressions` hook:

```typescript
// Current triggers:
// - Bingo or 50+ points: happy (scorer) / sad or angry (opponent)
// - 60+ points: opponent gets angry instead of sad

// Customize thresholds, add new expressions, etc.
```

## Future Enhancements

- [ ] Audio integration (commentary, sound effects)
- [ ] More expression types (thinking, celebrating, etc.)
- [ ] Customizable camera layouts
- [ ] Player name displays on avatars
- [ ] Replay controls in generated video
- [ ] Tournament bracket overlays

## Technical Notes

### Why Pure Functions?

Remotion requires **deterministic rendering** - the same frame must always render identically. This enables:
- Scrubbing (jumping to any frame instantly)
- Parallel rendering
- Consistent video output

Using React state or useEffect would break this, causing:
- Animations to restart when scrubbing
- Inconsistent renders
- Race conditions in parallel rendering

### Performance

- Avatar SVGs are lightweight (vector-based)
- 3D rendering uses React Three Fiber (optimized)
- No unnecessary re-renders (React.memo where needed)
- Efficient board state lookups

## License

See LICENSE file.

## Credits

Built with:
- [Remotion](https://www.remotion.dev/) - Video generation framework
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - 3D rendering
- [Three.js](https://threejs.org/) - 3D library

Avatar system inspired by Mii/Bitmoji generative avatar systems.
