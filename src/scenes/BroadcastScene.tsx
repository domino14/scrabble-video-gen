// Broadcast-style scene for professional Scrabble game visualization
// OBS-style layout with three separate 3D views (board + two racks)

import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";
import * as THREE from "three";
import { Board3DData } from "../types/board-3d-data";
import { TimingScript } from "../schemas/timing-script.schema";
import { BroadcastBoardView } from "../components/three/BroadcastBoardView";
import { BroadcastLayout } from "../components/overlays/BroadcastLayout";
import { Rack } from "../components/three/Rack";
import { AnimatedRackTile } from "../components/three/AnimatedRackTile";
import { getRackPosition, getRackTileRotation } from "../lib/board-coordinates";
import { secondsToFrames } from "../lib/audio-utils";

interface BroadcastSceneProps {
  boardStates: Board3DData[];
  timingScript: TimingScript;
  tileColor?: string;
  boardColor?: string;
}

// Helper to get letter value
function getLetterValue(letter: string): number {
  if (letter === letter.toLowerCase() && letter !== letter.toUpperCase()) {
    return 0; // blank tile
  }
  const values: Record<string, number> = {
    A: 1,
    E: 1,
    I: 1,
    O: 1,
    U: 1,
    L: 1,
    N: 1,
    S: 1,
    T: 1,
    R: 1,
    D: 2,
    G: 2,
    B: 3,
    C: 3,
    M: 3,
    P: 3,
    F: 4,
    H: 4,
    V: 4,
    W: 4,
    Y: 4,
    K: 5,
    J: 8,
    X: 8,
    Q: 10,
    Z: 10,
  };
  return values[letter.toUpperCase()] || 0;
}

export const BroadcastScene: React.FC<BroadcastSceneProps> = ({
  boardStates,
  timingScript,
  tileColor = "orange",
  boardColor = "jade",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeSeconds = frame / fps;

  // Find active cue
  const activeCue = useMemo(() => {
    return timingScript.cues
      .filter((cue) => cue.time <= currentTimeSeconds)
      .at(-1);
  }, [currentTimeSeconds, timingScript.cues]);

  // Determine current board state and state index
  const { currentBoardState, currentStateIndex } = useMemo(() => {
    if (!activeCue) {
      return {
        currentBoardState: boardStates[0] || {
          tiles: [],
          players: [],
          boardLayout: "",
          turnNumber: 0,
        },
        currentStateIndex: 0,
      };
    }

    // If no turnIndex (e.g., overview action), show the latest animated state
    if (activeCue.turnIndex === undefined) {
      const lastPlayCue = timingScript.cues
        .filter(
          (cue) =>
            (cue.action === "play_tiles" ||
              cue.action === "play_tiles_with_zoom") &&
            cue.time <= currentTimeSeconds,
        )
        .at(-1);

      if (lastPlayCue && lastPlayCue.turnIndex !== undefined) {
        const stateIndex = lastPlayCue.turnIndex + 1;
        return {
          currentBoardState:
            boardStates[stateIndex] || boardStates[boardStates.length - 1],
          currentStateIndex: stateIndex,
        };
      }

      return {
        currentBoardState: boardStates[0],
        currentStateIndex: 0,
      };
    }

    // For play_tiles actions, show the state WITH the move (at index turnIndex + 1)
    const stateIndex =
      activeCue.action === "play_tiles" ||
      activeCue.action === "play_tiles_with_zoom" ||
      activeCue.action === "highlight"
        ? activeCue.turnIndex + 1
        : activeCue.turnIndex;

    return {
      currentBoardState: boardStates[stateIndex] || boardStates[0],
      currentStateIndex: stateIndex,
    };
  }, [activeCue, boardStates, currentTimeSeconds, timingScript.cues]);

  // Track which turns have been animated (for tile rendering)
  const animatedTurns = useMemo(() => {
    const turns = new Set<number>();
    for (const cue of timingScript.cues) {
      if (cue.time > currentTimeSeconds) break;
      if (
        (cue.action === "play_tiles" ||
          cue.action === "play_tiles_with_zoom") &&
        cue.turnIndex !== undefined
      ) {
        turns.add(cue.turnIndex);
      }
    }
    return turns;
  }, [currentTimeSeconds, timingScript.cues]);

  // Check if we're currently animating tiles
  const playTilesCue = useMemo(() => {
    return timingScript.cues
      .filter(
        (cue) =>
          (cue.action === "play_tiles" ||
            cue.action === "play_tiles_with_zoom") &&
          cue.time <= currentTimeSeconds,
      )
      .at(-1);
  }, [currentTimeSeconds, timingScript.cues]);

  const showTileAnimation = useMemo(() => {
    if (!playTilesCue) return false;

    // Calculate animation duration based on number of tiles and speed
    const stateIndex = playTilesCue.turnIndex !== undefined ? playTilesCue.turnIndex + 1 : currentStateIndex;
    const state = boardStates[stateIndex];
    const numTiles = state?.tiles.filter(t => t.isNew).length || 0;

    // Use correct speed: 0.3 for play_tiles_with_zoom, timing script speed for regular play_tiles
    const actualSpeed = playTilesCue.action === 'play_tiles_with_zoom' ? 0.3 : (playTilesCue.speed || 1.0);
    const adjustedStagger = 8 / actualSpeed;
    const springDuration = 30 / actualSpeed; // Approximate spring settle time
    const animationDurationFrames = (numTiles - 1) * adjustedStagger + springDuration + 10; // +10 frames buffer

    const animStartFrame = secondsToFrames(playTilesCue.time, fps);
    return (
      frame >= animStartFrame && frame < animStartFrame + animationDurationFrames
    );
  }, [playTilesCue, frame, fps, currentStateIndex, boardStates]);

  // Prepare board data with animations
  const boardDataWithAnimations = useMemo(
    () => ({
      ...currentBoardState,
      tiles: (() => {
        return currentBoardState.tiles
          .map((tile) => {
            // Old tiles always render statically
            if (!tile.isNew) return tile;

            // Check if animation is in progress
            if (!showTileAnimation || !playTilesCue) {
              // Animation complete - return as static tile only if turn was animated
              const turnThatAddedTiles = currentStateIndex - 1;
              return animatedTurns.has(turnThatAddedTiles) ? tile : null;
            }

            // Animation in progress - add animation metadata
            const nextStateIndex = playTilesCue.turnIndex + 1;
            const nextState = boardStates[nextStateIndex];
            const playerIndex =
              playTilesCue.turnIndex % (nextState?.players.length || 2);
            const displayedRack = nextState?.players[playerIndex]?.rack || [];

            // Get all new tiles and find this tile's play index
            const newTiles = currentBoardState.tiles.filter((t) => t.isNew);
            const playIndex = newTiles.findIndex(
              (t) => t.row === tile.row && t.col === tile.col,
            );

            // Match tiles in order to find rack index
            const usedIndices = new Set<number>();
            for (let i = 0; i < playIndex; i++) {
              const prevTile = newTiles[i];
              const idx = displayedRack.findIndex((letter, j) => {
                if (usedIndices.has(j)) return false;
                if (prevTile.blank) return letter === "?";
                return letter.toUpperCase() === prevTile.letter.toUpperCase();
              });
              if (idx !== -1) usedIndices.add(idx);
            }

            // Find current tile's rack index
            let rackIndex = displayedRack.findIndex((letter, idx) => {
              if (usedIndices.has(idx)) return false;
              if (tile.blank) return letter === "?";
              return letter.toUpperCase() === tile.letter.toUpperCase();
            });

            if (rackIndex === -1) {
              rackIndex = playIndex;
            }

            return {
              ...tile,
              animationSource: {
                rackIndex,
                animationStartFrame: secondsToFrames(playTilesCue.time, fps),
                playIndex,
                speed:
                  playTilesCue.action === "play_tiles_with_zoom"
                    ? 0.3
                    : playTilesCue.speed || 1.0,
              },
            };
          })
          .filter(Boolean) as typeof currentBoardState.tiles;
      })(),
    }),
    [
      currentBoardState,
      showTileAnimation,
      playTilesCue,
      currentStateIndex,
      animatedTurns,
      boardStates,
    ],
  );

  // Determine playing player index from current animation cue
  // Use playerIndex from cue (source of truth from game history)
  const playingPlayerIndex = useMemo(() => {
    if (!showTileAnimation || !playTilesCue || playTilesCue.turnIndex === undefined) {
      return -1;
    }
    // Prefer explicit playerIndex from cue (source of truth from event.playerIndex)
    // Fallback to alternation for backwards compatibility (not reliable with challenges/multiple moves)
    return playTilesCue.playerIndex !== undefined
      ? playTilesCue.playerIndex
      : playTilesCue.turnIndex % 2;
  }, [showTileAnimation, playTilesCue]);

  // ALWAYS use per-player lookup for rack display
  // This ensures each player's rack is shown from their correct state
  const { player0Rack, player1Rack, player1, player2 } = useMemo(() => {
    const getPlayerRackState = (playerIndex: number) => {
      // During animation for THIS player: use the animation cue's state
      if (playingPlayerIndex === playerIndex && playTilesCue?.turnIndex !== undefined) {
        const stateIndex = playTilesCue.turnIndex + 1;
        return boardStates[stateIndex]?.players[playerIndex];
      }

      // Not animating or different player: show rack from their NEXT upcoming turn
      // This ensures we show the rack they'll play from next, not the one they just used
      const upcomingCue = timingScript.cues.find((c) => {
        if (
          (c.action !== "play_tiles" && c.action !== "play_tiles_with_zoom") ||
          c.turnIndex === undefined
        ) {
          return false;
        }
        // Check if this turn belongs to the requested player
        // Prefer explicit playerIndex from cue, fallback to alternation
        const cuePlayerIndex = c.playerIndex !== undefined
          ? c.playerIndex
          : c.turnIndex % 2;
        const isThisPlayer = cuePlayerIndex === playerIndex;

        // For upcoming: use cues at current time or later (not just future)
        // This shows the rack they're about to play or are playing
        return isThisPlayer && c.time >= currentTimeSeconds;
      });

      if (upcomingCue && upcomingCue.turnIndex !== undefined) {
        const stateIndex = upcomingCue.turnIndex + 1;
        return boardStates[stateIndex]?.players[playerIndex];
      }

      // No upcoming turns - show POST-PLAY rack from most recent completed turn
      // (PRE-PLAY rack with played tiles removed)
      const completedCue = timingScript.cues
        .filter((c) => {
          if (
            (c.action !== "play_tiles" && c.action !== "play_tiles_with_zoom") ||
            c.turnIndex === undefined ||
            c.time > currentTimeSeconds
          ) {
            return false;
          }
          // Check if this turn belongs to the requested player
          // Prefer explicit playerIndex from cue, fallback to alternation
          const cuePlayerIndex = c.playerIndex !== undefined
            ? c.playerIndex
            : c.turnIndex % 2;
          return cuePlayerIndex === playerIndex;
        })
        .at(-1);

      if (completedCue && completedCue.turnIndex !== undefined) {
        const stateIndex = completedCue.turnIndex + 1;
        const state = boardStates[stateIndex];
        const player = state?.players[playerIndex];

        if (!player) return null;

        // Compute POST-PLAY rack by removing played tiles
        const prePlayRack = player.rack || [];
        const playedTiles = state?.currentEvent?.playedTiles || '';

        // Parse played tiles (e.g., "FEE." -> ['F', 'E', 'E'])
        const tilesPlayed = playedTiles
          .split('')
          .filter(c => c !== '.')
          .map(c => c === '?' ? '?' : c);

        // Remove played tiles from rack
        const postPlayRack = [...prePlayRack];
        tilesPlayed.forEach(playedLetter => {
          const idx = postPlayRack.findIndex(rackLetter => {
            if (playedLetter === '?') return rackLetter === '?';
            return rackLetter.toUpperCase() === playedLetter.toUpperCase();
          });
          if (idx !== -1) {
            postPlayRack.splice(idx, 1);
          }
        });

        // Return player with POST-PLAY rack
        return {
          ...player,
          rack: postPlayRack,
        };
      }

      return null;
    };

    const p1 = getPlayerRackState(0);
    const p2 = getPlayerRackState(1);

    return {
      player0Rack: p1?.rack || [],
      player1Rack: p2?.rack || [],
      player1: p1 || currentBoardState.players[0],
      player2: p2 || currentBoardState.players[1],
    };
  }, [
    playingPlayerIndex,
    playTilesCue,
    boardStates,
    timingScript.cues,
    currentTimeSeconds,
    currentBoardState,
  ]);

  // Helper to calculate animated rack indices for a specific rack
  const getAnimatedIndices = (rack: string[], playerIndex: number) => {
    if (!showTileAnimation || playingPlayerIndex !== playerIndex || !playTilesCue) {
      return new Set<number>();
    }

    const indices = new Set<number>();
    const playedTiles = currentBoardState.tiles.filter((t) => t.isNew);
    const usedIndices = new Set<number>();
    const TILE_STAGGER = 8;
    const speed =
      playTilesCue.action === "play_tiles_with_zoom"
        ? 0.3
        : playTilesCue.speed || 1.0;
    const adjustedStagger = TILE_STAGGER / speed;
    const startFrame = secondsToFrames(playTilesCue.time, fps);
    const currentAnimFrame = frame - startFrame;

    playedTiles.forEach((tile, playIndex) => {
      const tileStartFrame = playIndex * adjustedStagger;
      if (currentAnimFrame >= tileStartFrame) {
        const rackIndex = rack.findIndex((letter, idx) => {
          if (usedIndices.has(idx)) return false;
          if (tile.blank) return letter === "?";
          return letter.toUpperCase() === tile.letter.toUpperCase();
        });
        if (rackIndex !== -1) {
          indices.add(rackIndex);
          usedIndices.add(rackIndex);
        }
      }
    });

    return indices;
  };

  // Convert racks to tile data with animation state
  const player1RackTiles = useMemo(() => {
    const animatedIndices = getAnimatedIndices(player0Rack, 0);

    return player0Rack.map((letter, i) => {
      const isBlank =
        letter === "?" ||
        (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
      const value = isBlank ? 0 : getLetterValue(letter);

      const isAnimated = animatedIndices.has(i);
      const playIndex = isAnimated
        ? Array.from(animatedIndices).filter((idx) => idx < i).length
        : 0;

      return {
        letter,
        value,
        rackIndex: i,
        animationState:
          isAnimated && playTilesCue
            ? {
                startFrame: secondsToFrames(playTilesCue.time, fps),
                playIndex,
                speed:
                  playTilesCue.action === "play_tiles_with_zoom"
                    ? 0.3
                    : playTilesCue.speed || 1.0,
              }
            : undefined,
      };
    });
  }, [player0Rack, playingPlayerIndex, showTileAnimation, playTilesCue, currentBoardState.tiles, frame, fps]);

  const player2RackTiles = useMemo(() => {
    const animatedIndices = getAnimatedIndices(player1Rack, 1);

    return player1Rack.map((letter, i) => {
      const isBlank =
        letter === "?" ||
        (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
      const value = isBlank ? 0 : getLetterValue(letter);

      const isAnimated = animatedIndices.has(i);
      const playIndex = isAnimated
        ? Array.from(animatedIndices).filter((idx) => idx < i).length
        : 0;

      return {
        letter,
        value,
        rackIndex: i,
        animationState:
          isAnimated && playTilesCue
            ? {
                startFrame: secondsToFrames(playTilesCue.time, fps),
                playIndex,
                speed:
                  playTilesCue.action === "play_tiles_with_zoom"
                    ? 0.3
                    : playTilesCue.speed || 1.0,
              }
            : undefined,
      };
    });
  }, [player1Rack, playingPlayerIndex, showTileAnimation, playTilesCue, currentBoardState.tiles, frame, fps]);

  // Debug: comprehensive logging
  if (frame % 30 === 0 && frame <= 300) {
    console.log(`\n=== Frame ${frame} (${currentTimeSeconds.toFixed(2)}s) ===`);
    console.log('Active cue:', activeCue?.action, 'turn:', activeCue?.turnIndex);
    console.log('Play tiles cue:', playTilesCue?.turnIndex, 'animating:', showTileAnimation);
    console.log('Playing player index:', playingPlayerIndex);
    console.log('\nBoard States in memory:');
    boardStates.slice(0, 4).forEach((state, i) => {
      console.log(`  State ${i}: P0=${state.players[0]?.rack?.join('') || 'EMPTY'}, P1=${state.players[1]?.rack?.join('') || 'EMPTY'}`);
    });
    console.log('\nDisplayed racks:');
    console.log('  Player0 (player1RackTiles):', player0Rack.join(''), '→', player1RackTiles.map(t => t.letter).join(''));
    console.log('  Player1 (player2RackTiles):', player1Rack.join(''), '→', player2RackTiles.map(t => t.letter).join(''));
    const p0Animated = player1RackTiles.filter(t => t.animationState).map(t => t.letter);
    const p1Animated = player2RackTiles.filter(t => t.animationState).map(t => t.letter);
    if (p0Animated.length > 0) console.log('  P0 animating:', p0Animated.join(''));
    if (p1Animated.length > 0) console.log('  P1 animating:', p1Animated.join(''));
  }

  // Track the on-turn player and find the play_tiles cue for their current turn
  // Tile pool should stay constant for the entire turn
  const tilePoolBoardState = useMemo(() => {
    const onTurnPlayer = currentBoardState.players.findIndex(p => p.onturn);

    // Find the most recent play_tiles cue for the current on-turn player
    const relevantPlayCue = timingScript.cues
      .filter(cue =>
        (cue.action === "play_tiles" || cue.action === "play_tiles_with_zoom") &&
        cue.time <= currentTimeSeconds &&
        cue.turnIndex !== undefined
      )
      .reverse()
      .find(cue => {
        // Check if this cue's turn matches the current on-turn player
        const cueState = boardStates[cue.turnIndex + 1];
        if (!cueState) return false;
        return cueState.players.findIndex(p => p.onturn) === onTurnPlayer;
      });

    if (relevantPlayCue && relevantPlayCue.turnIndex !== undefined) {
      // Use state at turnIndex to get board before this play
      const boardStateBeforePlay = boardStates[relevantPlayCue.turnIndex] || boardStates[0];
      const rackState = boardStates[relevantPlayCue.turnIndex + 1] || currentBoardState;

      // Create a combined state: board from before play, racks from the play's state
      const state: Board3DData = {
        ...boardStateBeforePlay,
        players: rackState.players.map(p => ({ ...p })),
      };

      return state;
    }

    return currentBoardState;
  }, [currentBoardState, timingScript.cues, currentTimeSeconds, boardStates]);

  return (
    <>
      <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
        {/* Board View - Center (main view) */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1030px",
            height: "900px",
            border: "3px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          <ThreeCanvas
            width={1030}
            height={900}
            camera={{
              fov: 50,
              position: [0, 0, 100],
              up: [0, 1, 0],
              near: 0.1,
              far: 1000,
            }}
            style={{ backgroundColor: "#1a1a1a" }}
            onCreated={({ gl }) => {
              try {
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.0;
              } catch (err) {
                console.warn("Error configuring renderer:", err);
              }
            }}
          >
            <BroadcastBoardView
              data={boardDataWithAnimations}
              tileColor={tileColor}
              boardColor={boardColor}
            />
          </ThreeCanvas>
        </div>

        {/* Rack 1 View - Bottom Left */}
        {player1 && (
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              left: "40px",
              width: "480px",
              height: "170px",
            }}
          >
            {/* Player label on top */}
            <div
              style={{
                position: "absolute",
                top: "-55px",
                left: "0",
                right: "0",
                height: "50px",
                backgroundColor: "rgba(30, 30, 30, 0.9)",
                border:
                  "2px solid " +
                  (player1.onturn ? "#4CAF50" : "rgba(255, 255, 255, 0.2)"),
                borderRadius: "8px 8px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                fontFamily: "Arial, sans-serif",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              {player1.nickname}
            </div>

            {/* Rack view */}
            <div
              style={{
                width: "100%",
                height: "100%",
                border:
                  "3px solid " +
                  (player1.onturn ? "#4CAF50" : "rgba(255, 255, 255, 0.3)"),
                borderRadius: "0 0 12px 12px",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              }}
            >
              <ThreeCanvas
                width={480}
                height={170}
                camera={{
                  fov: 53, // Wider FOV for slight fisheye effect
                  position: [0, -50, 15], // Camera at good angle and distance
                  up: [0, 1, 0],
                  near: 0.1,
                  far: 100,
                }}
                style={{ backgroundColor: "#0a0a0a" }}
                onCreated={({ camera }) => {
                  // Look up at the rack tiles
                  camera.lookAt(0, -38, -5);
                }}
              >
                {/* Lighting */}
                <ambientLight intensity={1.2} />
                <directionalLight position={[0, 10, 10]} intensity={1.5} />
                {/* Key light from above and front */}
                <pointLight position={[0, -35, 15]} intensity={2.5} distance={30} />
                {/* Fill light from the side */}
                <pointLight position={[-10, -40, 10]} intensity={1.5} distance={25} />
                <pointLight position={[10, -40, 10]} intensity={1.5} distance={25} />

                {/* Rack */}
                <Rack />

                {/* Rack tiles */}
                {player1RackTiles.map((tile, idx) => (
                  <AnimatedRackTile
                    key={`player1-rack-tile-${tile.rackIndex}-${idx}`}
                    letter={tile.letter}
                    value={tile.value}
                    rackIndex={tile.rackIndex}
                    animationState={tile.animationState}
                    isPlayer1={true}
                    tileColor={tileColor}
                  />
                ))}
              </ThreeCanvas>
            </div>
          </div>
        )}

        {/* Rack 2 View - Bottom Right */}
        {player2 && (
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              right: "40px",
              width: "480px",
              height: "170px",
            }}
          >
            {/* Player label on top */}
            <div
              style={{
                position: "absolute",
                top: "-55px",
                left: "0",
                right: "0",
                height: "50px",
                backgroundColor: "rgba(30, 30, 30, 0.9)",
                border:
                  "2px solid " +
                  (player2.onturn ? "#4CAF50" : "rgba(255, 255, 255, 0.2)"),
                borderRadius: "8px 8px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                fontFamily: "Arial, sans-serif",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              {player2.nickname}
            </div>

            {/* Rack view */}
            <div
              style={{
                width: "100%",
                height: "100%",
                border:
                  "3px solid " +
                  (player2.onturn ? "#4CAF50" : "rgba(255, 255, 255, 0.3)"),
                borderRadius: "0 0 12px 12px",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              }}
            >
              <ThreeCanvas
                width={480}
                height={170}
                camera={{
                  fov: 53, // Wider FOV for slight fisheye effect
                  position: [0, -50, 15], // Camera at good angle and distance
                  up: [0, 1, 0],
                  near: 0.1,
                  far: 100,
                }}
                style={{ backgroundColor: "#0a0a0a" }}
                onCreated={({ camera }) => {
                  // Look up at the rack tiles
                  camera.lookAt(0, -38, -5);
                }}
              >
                {/* Lighting */}
                <ambientLight intensity={1.2} />
                <directionalLight position={[0, 10, 10]} intensity={1.5} />
                {/* Key light from above and front */}
                <pointLight position={[0, -35, 15]} intensity={2.5} distance={30} />
                {/* Fill light from the side */}
                <pointLight position={[-10, -40, 10]} intensity={1.5} distance={25} />
                <pointLight position={[10, -40, 10]} intensity={1.5} distance={25} />

                {/* Rack */}
                <Rack />

                {/* Rack tiles */}
                {player2RackTiles.map((tile, idx) => (
                  <AnimatedRackTile
                    key={`player2-rack-tile-${tile.rackIndex}-${idx}`}
                    letter={tile.letter}
                    value={tile.value}
                    rackIndex={tile.rackIndex}
                    animationState={tile.animationState}
                    isPlayer1={false}
                    tileColor={tileColor}
                  />
                ))}
              </ThreeCanvas>
            </div>
          </div>
        )}
      </AbsoluteFill>

      {/* Broadcast overlays (remaining tiles, move notation) */}
      <BroadcastLayout
        boardState={currentBoardState}
        tilePoolBoardState={tilePoolBoardState}
        tileColor={tileColor}
        showMoveNotation={
          currentBoardState.currentEvent &&
          (activeCue?.action === "play_tiles" ||
            activeCue?.action === "play_tiles_with_zoom")
        }
        moveNotationStartFrame={
          activeCue ? secondsToFrames(activeCue.time, fps) : 0
        }
      />
    </>
  );
};
