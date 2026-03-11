// Main board scene with audio-driven animations

import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import * as THREE from 'three';
import { Board3DData } from '../types/board-3d-data';
import { TimingScript } from '../schemas/timing-script.schema';
import { ScrabbleBoard } from '../components/three/ScrabbleBoard';
import { Tile } from '../components/three/Tile';
import { TileAnimated } from '../components/three/TileAnimated';
import { TileExchangeAnimated } from '../components/three/TileExchangeAnimated';
import { TileToScorecardAnimated } from '../components/three/TileToScorecardAnimated';
import { CameraController, CameraKeyframe } from '../components/three/CameraController';
import { TileGlow } from '../components/effects/TileGlow';
import { Scorecard } from '../components/overlays/Scorecard';
import { MoveNotation } from '../components/overlays/MoveNotation';
import { TurnIndicator } from '../components/overlays/TurnIndicator';
import { getBoardPosition, getRackPosition, getRackTileRotation, getOverviewCameraPosition, getOverviewCameraTarget, getZoomCameraPosition } from '../lib/board-coordinates';
import { secondsToFrames } from '../lib/audio-utils';

interface BoardSceneProps {
  boardStates: Board3DData[];
  timingScript: TimingScript;
  tileColor?: string;
  boardColor?: string;
}

// Helper to get letter value (matching game-converter logic)
function getLetterValue(letter: string): number {
  if (letter === letter.toLowerCase() && letter !== letter.toUpperCase()) {
    return 0; // blank tile
  }
  const values: Record<string, number> = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10,
  };
  return values[letter.toUpperCase()] || 0;
}

export const BoardScene: React.FC<BoardSceneProps> = ({
  boardStates,
  timingScript,
  tileColor = 'orange',
  boardColor = 'jade',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeSeconds = frame / fps;

  // Find active cue
  const activeCue = useMemo(() => {
    const cue = timingScript.cues
      .filter(cue => cue.time <= currentTimeSeconds)
      .at(-1);
    if (frame % 30 === 0) { // Log every second
      console.log(`Time: ${currentTimeSeconds.toFixed(1)}s, Frame: ${frame}, Active cue:`, cue);
    }
    return cue;
  }, [currentTimeSeconds, timingScript.cues, frame]);

  // Determine current board state and state index
  const { currentBoardState, currentStateIndex } = useMemo(() => {
    if (!activeCue) {
      return {
        currentBoardState: boardStates[0] || {
          tiles: [],
          players: [],
          boardLayout: '',
          turnNumber: 0,
        },
        currentStateIndex: 0,
      };
    }

    // If no turnIndex (e.g., overview action), show the latest animated state
    if (activeCue.turnIndex === undefined) {
      // Find the last play_tiles or play_tiles_with_zoom cue that occurred before this time
      const lastPlayCue = timingScript.cues
        .filter(cue => (cue.action === 'play_tiles' || cue.action === 'play_tiles_with_zoom') && cue.time <= currentTimeSeconds)
        .at(-1);

      if (lastPlayCue && lastPlayCue.turnIndex !== undefined) {
        // Show the state after that play
        const stateIndex = lastPlayCue.turnIndex + 1;
        return {
          currentBoardState: boardStates[stateIndex] || boardStates[boardStates.length - 1],
          currentStateIndex: stateIndex,
        };
      }

      // If no plays yet, show initial state
      return {
        currentBoardState: boardStates[0],
        currentStateIndex: 0,
      };
    }

    // For show_turn: show the state BEFORE the move (at index turnIndex)
    // For play_tiles/play_tiles_with_zoom/highlight: show the state WITH the move (at index turnIndex + 1)
    const stateIndex = (activeCue.action === 'play_tiles' || activeCue.action === 'play_tiles_with_zoom' || activeCue.action === 'highlight')
      ? activeCue.turnIndex + 1
      : activeCue.turnIndex;

    return {
      currentBoardState: boardStates[stateIndex] || boardStates[0],
      currentStateIndex: stateIndex,
    };
  }, [activeCue, boardStates, currentTimeSeconds, timingScript.cues]);

  // Generate camera keyframes based on timing cues
  const cameraKeyframes = useMemo((): CameraKeyframe[] => {
    const keyframes: CameraKeyframe[] = [];

    timingScript.cues.forEach((cue) => {
      const cueFrame = secondsToFrames(cue.time, fps);

      switch (cue.action) {
        case 'overview':
          keyframes.push({
            frame: cueFrame,
            position: [0, -40, 90],
            lookAt: [0, -10, 0],
          });
          break;

        case 'zoom':
          if (cue.targetSquare) {
            const targetPos = getBoardPosition(cue.targetSquare.row, cue.targetSquare.col);

            // Use custom camera position if provided, otherwise calculate default
            let cameraPos: [number, number, number];
            if (cue.cameraPosition) {
              cameraPos = cue.cameraPosition;
            } else {
              const zoomPos = getZoomCameraPosition(cue.targetSquare.row, cue.targetSquare.col);
              cameraPos = [zoomPos.x, zoomPos.y, zoomPos.z];
            }

            keyframes.push({
              frame: cueFrame,
              position: cameraPos,
              lookAt: [targetPos.x, targetPos.y, targetPos.z],
            });
          }
          break;

        case 'play_tiles_with_zoom':
          if (cue.turnIndex !== undefined) {
            const stateIndex = cue.turnIndex + 1;
            const state = boardStates[stateIndex];
            if (!state) break;

            let newTiles = state.tiles.filter(t => t.isNew);
            if (newTiles.length === 0) break;

            // Sort tiles in placement order (vertical: by row, horizontal: by column)
            const isVertical = newTiles.every(t => t.col === newTiles[0].col);
            const isHorizontal = newTiles.every(t => t.row === newTiles[0].row);
            if (isVertical) {
              newTiles = [...newTiles].sort((a, b) => a.row - b.row);
            } else if (isHorizontal) {
              newTiles = [...newTiles].sort((a, b) => a.col - b.col);
            }

            const speed = cue.speed || 1.0;
            const adjustedStagger = 8 / speed; // TILE_STAGGER / speed
            const zoomHeight = cue.zoomHeight || 15;

            // For each tile: add keyframes to hold camera stationary at each position
            newTiles.forEach((tile, index) => {
              // Camera at the SAME row/col as the tile, but at height zoomHeight
              const targetPos = getBoardPosition(tile.row, tile.col);
              const tileStartFrame = cueFrame + index * adjustedStagger;

              // Add keyframe when this tile starts animating
              keyframes.push({
                frame: tileStartFrame,
                position: [targetPos.x, targetPos.y, zoomHeight],
                lookAt: [targetPos.x, targetPos.y, targetPos.z],
              });

              // Hold camera stationary until after this tile finishes
              const holdUntilFrame = index < newTiles.length - 1
                ? tileStartFrame + adjustedStagger - 2  // Hold until just before next tile
                : tileStartFrame + 60;                   // Last tile: hold for 60 frames

              keyframes.push({
                frame: holdUntilFrame,
                position: [targetPos.x, targetPos.y, zoomHeight],
                lookAt: [targetPos.x, targetPos.y, targetPos.z],
              });
            });
          }
          break;
      }
    });

    // Add default overview at start if no keyframe
    if (keyframes.length === 0 || keyframes[0].frame > 0) {
      keyframes.unshift({
        frame: 0,
        position: [0, -40, 90],
        lookAt: [0, -10, 0],
      });
    }

    console.log('Camera keyframes:', keyframes);
    return keyframes;
  }, [timingScript.cues, fps]);

  // Check if we should show tile animations
  // Find the most recent play_tiles action and check if animation is still running
  const { isPlayingTiles, playTilesCue } = useMemo(() => {
    const recentPlayTiles = timingScript.cues
      .filter(cue => (cue.action === 'play_tiles' || cue.action === 'play_tiles_with_zoom') && cue.time <= currentTimeSeconds)
      .at(-1);

    if (!recentPlayTiles || recentPlayTiles.turnIndex === undefined) {
      return { isPlayingTiles: false, playTilesCue: null };
    }

    // Calculate animation duration based on number of tiles and speed
    const stateIndex = recentPlayTiles.turnIndex + 1;
    const state = boardStates[stateIndex];
    const numTiles = state?.tiles.filter(t => t.isNew).length || 0;
    const speed = recentPlayTiles.speed || 1.0;
    const adjustedStagger = 8 / speed;
    const springDuration = 30 / speed; // Approximate spring settle time
    const animationDuration = ((numTiles - 1) * adjustedStagger + springDuration + 10) / fps; // +10 frames buffer

    // Check if we're within the animation duration
    const timeSinceStart = currentTimeSeconds - recentPlayTiles.time;
    const stillAnimating = timeSinceStart < animationDuration;

    return {
      isPlayingTiles: stillAnimating,
      playTilesCue: stillAnimating ? recentPlayTiles : null
    };
  }, [currentTimeSeconds, timingScript.cues, boardStates, fps]);

  const showTileAnimation = isPlayingTiles && currentBoardState.currentEvent;
  const showExchangeAnimation = activeCue?.action === 'exchange' && currentBoardState.currentEvent;
  const showEndRackAnimation = activeCue?.action === 'end_rack' && currentBoardState.currentEvent;

  // Debug logging around end_rack time
  if (currentTimeSeconds >= 100.5 && currentTimeSeconds <= 102) {
    console.log(`Frame ${frame} (${currentTimeSeconds.toFixed(2)}s):`, {
      activeCueAction: activeCue?.action,
      activeCueTurn: activeCue?.turnIndex,
      showTileAnimation,
      showEndRackAnimation,
      hasCurrentEvent: !!currentBoardState.currentEvent,
      currentStateTurn: currentBoardState.turnNumber,
      playTilesCueTurn: playTilesCue?.turnIndex,
    });
  }

  // Track which turns have been animated (to keep tiles visible after animation)
  const animatedTurns = useMemo(() => {
    const turns = new Set<number>();
    timingScript.cues.forEach(cue => {
      if ((cue.action === 'play_tiles' || cue.action === 'play_tiles_with_zoom') &&
          cue.turnIndex !== undefined &&
          cue.time <= currentTimeSeconds) {
        turns.add(cue.turnIndex);
      }
    });
    return turns;
  }, [currentTimeSeconds, timingScript.cues]);

  return (
    <>
      {/* 3D Scene */}
      <ThreeCanvas
        width={1920}
        height={1080}
        camera={{ fov: 50, position: [0, -40, 90] }}
        style={{ backgroundColor: '#222222' }}
        onCreated={({ gl }) => {
          try {
            // Renderer settings from liwords
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
          } catch (err) {
            console.warn('Error configuring renderer:', err);
          }
        }}
      >
        <CameraController keyframes={cameraKeyframes} />

        <ScrabbleBoard
          data={{
            ...currentBoardState,
            tiles: (() => {
              if (showTileAnimation) {
                // During animation: hide new tiles (they'll be shown as animated tiles)
                return currentBoardState.tiles.filter(tile => !tile.isNew);
              } else {
                // Show all tiles that have been animated, hide tiles that haven't been animated yet
                return currentBoardState.tiles.filter(tile => {
                  if (!tile.isNew) return true; // Old tiles always visible
                  // New tiles in boardStates[N] are from turn N-1
                  const turnThatAddedTiles = currentStateIndex - 1;
                  return animatedTurns.has(turnThatAddedTiles);
                });
              }
            })()
          }}
          tileColor={tileColor}
          boardColor={boardColor}
        />

        {/* Tiles on rack - show during show_turn, overview, play_tiles, or while animating */}
        {(activeCue?.action === 'show_turn' || activeCue?.action === 'overview' || activeCue?.action === 'play_tiles' || activeCue?.action === 'play_tiles_with_zoom' || showTileAnimation || showExchangeAnimation || showEndRackAnimation) &&
         (activeCue?.action === 'overview' || activeCue?.turnIndex !== undefined || playTilesCue?.turnIndex !== undefined) && (
          <>
            {(() => {
              // Determine which cue to use for rack display
              // Priority: end_rack > show_turn > active play_tiles animation > overview (look ahead) > activeCue
              let cue;
              if (showEndRackAnimation) {
                cue = activeCue;
              } else if (activeCue?.action === 'show_turn' || activeCue?.action === 'play_tiles' || activeCue?.action === 'play_tiles_with_zoom') {
                // If activeCue is explicitly showing a turn/tiles, use it (not stale animation)
                cue = activeCue;
              } else if (activeCue?.action === 'overview') {
                // During overview, look ahead to the next show_turn or play_tiles cue
                const upcomingCue = timingScript.cues.find(c =>
                  c.time > currentTimeSeconds &&
                  (c.action === 'show_turn' || c.action === 'play_tiles' || c.action === 'play_tiles_with_zoom')
                );
                cue = upcomingCue || null;
              } else if (showTileAnimation) {
                // Otherwise, if tiles are animating, use the animation cue
                cue = playTilesCue;
              } else {
                cue = activeCue;
              }

              if (!cue || cue.turnIndex === undefined) return null;

              // For end_rack, use the CURRENT state (which has the rack data)
              // For play_tiles/exchange, look ahead to the NEXT state
              let state: Board3DData | undefined;
              let playerIndex: number;

              if (showEndRackAnimation) {
                // Use current state for end_rack
                state = boardStates[cue.turnIndex];
                if (!state) return null;

                // The player who is on turn gets the points, show the OTHER player's rack
                const receivingPlayerIndex = state.players.findIndex(p => p.onturn);
                playerIndex = (receivingPlayerIndex + 1) % state.players.length;
              } else {
                // Look ahead to the NEXT state to get the rack data
                const nextStateIndex = cue.turnIndex + 1;
                state = boardStates[nextStateIndex];
                if (!state) return null;

                playerIndex = cue.turnIndex % state.players.length;

                // Debug turn 3 rack display
                if (cue.turnIndex === 3 && currentTimeSeconds >= 11.5 && currentTimeSeconds <= 13.5) {
                  console.log(`Turn 3 rack debug @ ${currentTimeSeconds.toFixed(2)}s:`, {
                    cueAction: cue.action,
                    cueTurnIndex: cue.turnIndex,
                    stateIndex: nextStateIndex,
                    playerIndex: playerIndex,
                    rackLetters: state.players[playerIndex]?.rack?.join('') || 'EMPTY',
                    allPlayers: state.players.map((p, i) => `P${i}: ${p.rack?.join('') || 'EMPTY'}`)
                  });
                }
              }

              const player = state.players[playerIndex];

              if (!player || !player.rack || player.rack.length === 0) {
                if (cue.turnIndex === 3 && currentTimeSeconds >= 11.5 && currentTimeSeconds <= 13.5) {
                  console.log('Turn 3 rack EMPTY - returning null:', { player: !!player, hasRack: !!player?.rack, rackLength: player?.rack?.length });
                }
                return null;
              }

              // During animation, find which specific rack indices should be hidden (only tiles that have started animating)
              // Also hide tiles that have been played (even after animation completes)
              const animatedRackIndices = new Set<number>();

              // If activeCue is play_tiles and animation is complete, hide all played tiles
              if ((activeCue?.action === 'play_tiles' || activeCue?.action === 'play_tiles_with_zoom') && !showTileAnimation && activeCue.turnIndex !== undefined) {
                const stateIndex = activeCue.turnIndex + 1;
                const state = boardStates[stateIndex];
                const playedTiles = state?.tiles.filter(t => t.isNew) || [];
                const usedIndices = new Set<number>();

                playedTiles.forEach((tile) => {
                  const rackIndex = player.rack.findIndex((letter, idx) => {
                    if (usedIndices.has(idx)) return false;
                    if (tile.blank) return letter === '?';
                    return letter.toUpperCase() === tile.letter.toUpperCase();
                  });

                  if (rackIndex !== -1) {
                    animatedRackIndices.add(rackIndex);
                    usedIndices.add(rackIndex);
                  }
                });
              } else if (showEndRackAnimation) {
                // Hide rack tiles as they start animating away (prioritize over showTileAnimation)
                const rackLetters = currentBoardState.currentEvent?.playedTiles?.split('') || [];
                const usedIndices = new Set<number>();
                const TILE_STAGGER = 8;
                const speed = activeCue.speed || 1.0;
                const adjustedStagger = TILE_STAGGER / speed;
                const animStartFrame = secondsToFrames(activeCue.time, fps);
                const currentAnimFrame = frame - animStartFrame;

                rackLetters.forEach((letter, tileIndex) => {
                  const tileStartFrame = tileIndex * adjustedStagger;

                  if (currentAnimFrame >= tileStartFrame) {
                    const rackIndex = player.rack.findIndex((rackLetter, idx) => {
                      if (usedIndices.has(idx)) return false;
                      return rackLetter === letter;
                    });

                    if (rackIndex !== -1) {
                      animatedRackIndices.add(rackIndex);
                      usedIndices.add(rackIndex);
                    }
                  }
                });
              } else if (showTileAnimation) {
                const playedTiles = currentBoardState.tiles.filter(tile => tile.isNew);
                const usedIndices = new Set<number>();
                const TILE_STAGGER = 8; // frames between tiles (at speed 1.0)
                const speed = cue.speed || 1.0;
                const adjustedStagger = TILE_STAGGER / speed; // Lower speed = more frames between tiles
                const animStartFrame = secondsToFrames(cue.time, fps);
                const currentAnimFrame = frame - animStartFrame;

                playedTiles.forEach((tile, playIndex) => {
                  // Calculate when this tile's animation starts (with adjusted stagger based on speed)
                  const tileStartFrame = playIndex * adjustedStagger;

                  // Only hide this tile from rack if its animation has started
                  if (currentAnimFrame >= tileStartFrame) {
                    const rackIndex = player.rack.findIndex((letter, idx) => {
                      if (usedIndices.has(idx)) return false;

                      if (tile.blank) {
                        // Playing a blank - find the first '?' on the rack
                        return letter === '?';
                      } else {
                        // Playing a regular tile - match the letter
                        return letter.toUpperCase() === tile.letter.toUpperCase();
                      }
                    });

                    if (rackIndex !== -1) {
                      animatedRackIndices.add(rackIndex);
                      usedIndices.add(rackIndex);
                    }
                  }
                });
              } else if (showExchangeAnimation) {
                // Hide exchanged tiles as they animate away
                const exchangedLetters = currentBoardState.currentEvent?.playedTiles?.split('') || [];
                const usedIndices = new Set<number>();
                const TILE_STAGGER = 8;
                const speed = activeCue.speed || 1.0;
                const adjustedStagger = TILE_STAGGER / speed;
                const animStartFrame = secondsToFrames(activeCue.time, fps);
                const currentAnimFrame = frame - animStartFrame;

                exchangedLetters.forEach((letter, exchangeIndex) => {
                  const tileStartFrame = exchangeIndex * adjustedStagger;

                  if (currentAnimFrame >= tileStartFrame) {
                    const rackIndex = player.rack.findIndex((rackLetter, idx) => {
                      if (usedIndices.has(idx)) return false;
                      return rackLetter === letter;
                    });

                    if (rackIndex !== -1) {
                      animatedRackIndices.add(rackIndex);
                      usedIndices.add(rackIndex);
                    }
                  }
                });
              }

              const rackTiles = player.rack.map((letter, index) => {
                // Hide only the specific rack positions being animated
                if (animatedRackIndices.has(index)) {
                  if (cue.turnIndex === 3 && currentTimeSeconds >= 11.5 && currentTimeSeconds <= 13.5 && index === 0) {
                    console.log('Turn 3: Tile', index, 'is hidden (animated)');
                  }
                  return null;
                }

                const rackPos = getRackPosition(index);
                const theta = getRackTileRotation();

                if (cue.turnIndex === 3 && currentTimeSeconds >= 11.5 && currentTimeSeconds <= 13.5 && index === 0) {
                  console.log('Turn 3: Rendering tile', index, letter, 'at position:', rackPos, 'rotation:', theta);
                }

                // Determine tile value from letter (blank detection)
                // Blanks can be '?' or lowercase letters
                const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
                const value = isBlank ? 0 : getLetterValue(letter);

                return (
                  <group
                    key={`rack-tile-${index}`}
                    position={[rackPos.x, rackPos.y, rackPos.z]}
                    rotation-x={theta}
                  >
                    <Tile
                      letter={letter}
                      value={value}
                      position={[0, 0, 0]}
                      color={tileColor}
                      blank={isBlank}
                    />
                  </group>
                );
              });

              return rackTiles;
            })()}
          </>
        )}

        {/* Tile placement animations */}
        {showTileAnimation && currentBoardState.currentEvent && playTilesCue && (
          <>
            {(() => {
              // Get the SAME rack that's being displayed (from next state)
              const nextStateIndex = playTilesCue.turnIndex + 1;
              const nextState = boardStates[nextStateIndex];
              const playerIndex = playTilesCue.turnIndex % (nextState?.players.length || 2);
              const displayedRack = nextState?.players[playerIndex]?.rack || [];

              return currentBoardState.tiles
                .filter(tile => tile.isNew)
                .map((tile, playIndex) => {
                  // Find this tile in the displayed rack (same rack shown to user)
                  const usedIndices = new Set<number>();
                  let rackIndex = -1;

                  // Match tiles in order to handle duplicates
                  for (let i = 0; i < playIndex; i++) {
                    const prevTile = currentBoardState.tiles.filter(t => t.isNew)[i];
                    const idx = displayedRack.findIndex((letter, j) => {
                      if (usedIndices.has(j)) return false;
                      if (prevTile.blank) return letter === '?';
                      return letter.toUpperCase() === prevTile.letter.toUpperCase();
                    });
                    if (idx !== -1) usedIndices.add(idx);
                  }

                  // Now find current tile
                  rackIndex = displayedRack.findIndex((letter, idx) => {
                    if (usedIndices.has(idx)) return false;
                    if (tile.blank) return letter === '?';
                    return letter.toUpperCase() === tile.letter.toUpperCase();
                  });

                  // If not found, use play order
                  if (rackIndex === -1) {
                    rackIndex = playIndex;
                  }

                  const startPos = getRackPosition(rackIndex);
                  const endPos = getBoardPosition(tile.row, tile.col);
                  const animStartFrame = secondsToFrames(playTilesCue.time, fps);

                  return (
                    <TileAnimated
                      key={`animated-${tile.row}-${tile.col}`}
                      letter={tile.letter}
                      value={tile.value}
                      startPosition={[startPos.x, startPos.y, startPos.z]}
                      endPosition={[endPos.x, endPos.y, endPos.z]}
                      color={tileColor}
                      blank={tile.blank}
                      startFrame={animStartFrame}
                      index={playIndex}
                      speed={playTilesCue.speed || 1.0}
                    />
                  );
                });
            })()}
          </>
        )}

        {/* Exchange animations - tiles fly away from rack */}
        {showExchangeAnimation && currentBoardState.currentEvent && activeCue.turnIndex !== undefined && (
          <>
            {(() => {
              // Get the rack that's being displayed (from next state)
              const nextStateIndex = activeCue.turnIndex + 1;
              const nextState = boardStates[nextStateIndex];
              const playerIndex = activeCue.turnIndex % (nextState?.players.length || 2);
              const displayedRack = nextState?.players[playerIndex]?.rack || [];

              // Parse exchanged tiles from currentEvent.playedTiles (this is the 'exchanged' field)
              const exchangedLetters = currentBoardState.currentEvent.playedTiles.split('');

              return exchangedLetters.map((letter, exchangeIndex) => {
                // Find this letter in the rack
                const usedIndices = new Set<number>();

                // Match previous exchanged tiles to avoid duplicates
                for (let i = 0; i < exchangeIndex; i++) {
                  const prevLetter = exchangedLetters[i];
                  const idx = displayedRack.findIndex((rackLetter, j) => {
                    if (usedIndices.has(j)) return false;
                    return rackLetter === prevLetter;
                  });
                  if (idx !== -1) usedIndices.add(idx);
                }

                // Find current exchanged letter in rack
                let rackIndex = displayedRack.findIndex((rackLetter, idx) => {
                  if (usedIndices.has(idx)) return false;
                  return rackLetter === letter;
                });

                if (rackIndex === -1) {
                  rackIndex = exchangeIndex; // Fallback
                }

                const startPos = getRackPosition(rackIndex);
                const animStartFrame = secondsToFrames(activeCue.time, fps);

                const isBlank = letter === letter.toLowerCase() && letter !== letter.toUpperCase();
                const value = isBlank ? 0 : getLetterValue(letter);

                return (
                  <TileExchangeAnimated
                    key={`exchange-${exchangeIndex}`}
                    letter={letter}
                    value={value}
                    startPosition={[startPos.x, startPos.y, startPos.z]}
                    color={tileColor}
                    blank={isBlank}
                    startFrame={animStartFrame}
                    index={exchangeIndex}
                    speed={activeCue.speed || 1.0}
                  />
                );
              });
            })()}
          </>
        )}

        {/* End-game rack penalty - tiles fly to opponent's scorecard */}
        {showEndRackAnimation && currentBoardState.currentEvent && activeCue.turnIndex !== undefined && (
          <>
            {(() => {
              // currentEvent.playedTiles contains the remaining rack letters (e.g., "IRT")
              // We need to find which player has these tiles and animate to the other player
              const endRackState = boardStates[activeCue.turnIndex];
              if (!endRackState) return null;

              // The player who gets the points is onturn
              const receivingPlayerIndex = endRackState.players.findIndex(p => p.onturn);
              const givingPlayerIndex = (receivingPlayerIndex + 1) % 2;

              // Get the rack of the player giving the tiles
              const givingPlayer = endRackState.players[givingPlayerIndex];
              const rackLetters = currentBoardState.currentEvent.playedTiles.split('');

              return rackLetters.map((letter, tileIndex) => {
                // Find rack position for this tile
                const usedIndices = new Set<number>();

                // Match previous tiles to avoid duplicates
                for (let i = 0; i < tileIndex; i++) {
                  const prevLetter = rackLetters[i];
                  const idx = givingPlayer?.rack.findIndex((rackLetter, j) => {
                    if (usedIndices.has(j)) return false;
                    return rackLetter === prevLetter;
                  });
                  if (idx !== -1) usedIndices.add(idx);
                }

                // Find current tile in rack
                let rackIndex = givingPlayer?.rack.findIndex((rackLetter, idx) => {
                  if (usedIndices.has(idx)) return false;
                  return rackLetter === letter;
                }) ?? -1;

                if (rackIndex === -1) {
                  rackIndex = tileIndex; // Fallback
                }

                const startPos = getRackPosition(rackIndex);
                const animStartFrame = secondsToFrames(activeCue.time, fps);

                const isBlank = letter === letter.toLowerCase() && letter !== letter.toUpperCase();
                const value = isBlank ? 0 : getLetterValue(letter);

                return (
                  <TileToScorecardAnimated
                    key={`end-rack-${tileIndex}`}
                    letter={letter}
                    value={value}
                    startPosition={[startPos.x, startPos.y, startPos.z]}
                    targetPlayerIndex={receivingPlayerIndex}
                    color={tileColor}
                    blank={isBlank}
                    startFrame={animStartFrame}
                    index={tileIndex}
                    speed={activeCue.speed || 1.0}
                  />
                );
              });
            })()}
          </>
        )}

        {/* Highlight glow effect */}
        {activeCue?.action === 'highlight' && activeCue.turnIndex !== undefined && (() => {
          // Get the tiles from the highlighted turn (they're not "new" anymore)
          const highlightStateIndex = activeCue.turnIndex + 1;
          const highlightState = boardStates[highlightStateIndex];
          if (!highlightState) return null;

          // Find tiles that were played in this specific turn
          const prevState = boardStates[activeCue.turnIndex];
          const prevTileKeys = new Set(prevState?.tiles.map(t => `${t.row},${t.col}`) || []);
          const highlightedTiles = highlightState.tiles.filter(t => !prevTileKeys.has(`${t.row},${t.col}`));

          return highlightedTiles.map((tile, index) => {
            const position = getBoardPosition(tile.row, tile.col);
            return (
              <TileGlow
                key={`glow-${tile.row}-${tile.col}-${index}`}
                position={[position.x, position.y, position.z - 1]}
              />
            );
          });
        })()}
      </ThreeCanvas>

      {/* Overlays */}
      <Scorecard players={currentBoardState.players} />

      {/* Move notation */}
      {currentBoardState.currentEvent && (activeCue?.action === 'play_tiles' || activeCue?.action === 'play_tiles_with_zoom') && (
        <MoveNotation
          notation={currentBoardState.lastMoveNotation}
          isBingo={currentBoardState.currentEvent.isBingo}
          score={currentBoardState.currentEvent.score}
          startFrame={secondsToFrames(activeCue.time, fps)}
        />
      )}

      {/* Turn indicator */}
      {/* {activeCue?.action === 'show_turn' && activeCue.turnIndex !== undefined && (
        <TurnIndicator
          turnNumber={activeCue.turnIndex + 1}
          totalTurns={boardStates.length}
          startFrame={secondsToFrames(activeCue.time, fps)}
        />
      )} */}
    </>
  );
};
