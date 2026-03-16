// Main board scene with audio-driven animations

import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Board3DData } from '../types/board-3d-data';
import { TimingScript } from '../schemas/timing-script.schema';
import { ScrabbleBoard } from '../components/three/ScrabbleBoard';
import { TileExchangeAnimated } from '../components/three/TileExchangeAnimated';
import { TileToScorecardAnimated } from '../components/three/TileToScorecardAnimated';
import { AnimatedRackTile } from '../components/three/AnimatedRackTile';
import { CameraController, CameraKeyframe } from '../components/three/CameraController';
import { TileGlow } from '../components/effects/TileGlow';
import { Scorecard } from '../components/overlays/Scorecard';
import { MoveNotation } from '../components/overlays/MoveNotation';
import { getBoardPosition, getRackPosition, getRackTileRotation, getZoomCameraPosition } from '../lib/board-coordinates';
import { secondsToFrames } from '../lib/audio-utils';
import {
  computeRackDrawPlan,
  computeDrawPhaseTiming,
  getDrawPhase,
  getLetterValue,
  SWAP_DURATION,
  type RackDrawPlan,
  type DrawPhaseTiming,
} from '../lib/rack-animation-utils';

interface BoardSceneProps {
  boardStates: Board3DData[];
  timingScript: TimingScript;
  tileColor?: string;
  boardColor?: string;
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
    let activeZoomEndFrame = -1;

    timingScript.cues.forEach((cue) => {
      const cueFrame = secondsToFrames(cue.time, fps);

      switch (cue.action) {
        case 'overview':
          keyframes.push({
            frame: Math.max(cueFrame, activeZoomEndFrame + 1),
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

            const zoomHeight = cue.zoomHeight || 15;

            // Camera offset: position camera in Y to keep tiles centered in frame
            const cameraYOffset = 5; // Offset forward to center tiles in frame

            const animSpeed = cue.speed || 1.0;
            const staggerFrames = 8 / animSpeed;
            const tileFallTime = 30 / animSpeed; // spring settle time scaled by speed

            const firstTile = newTiles[0];
            const lastTile = newTiles[newTiles.length - 1];

            const firstTilePos = getBoardPosition(firstTile.row, firstTile.col);
            const lastTilePos = getBoardPosition(lastTile.row, lastTile.col);

            // Continuous pan from first tile to last tile
            // Start: when first tile starts falling
            // End: when last tile lands
            const panStartFrame = cueFrame;
            const lastTileStartFrame = cueFrame + (newTiles.length - 1) * staggerFrames;
            const panEndFrame = lastTileStartFrame + tileFallTime;

            console.log('=== CONTINUOUS PAN MODEL ===');
            console.log('Tiles: ' + newTiles.length);
            console.log('Stagger: ' + staggerFrames.toFixed(1) + ' frames');
            console.log('Tile fall time: ' + tileFallTime + ' frames');
            console.log('Pan start frame: ' + panStartFrame);
            console.log('Pan end frame: ' + panEndFrame);
            console.log('Total pan duration: ' + (panEndFrame - panStartFrame) + ' frames');

            // Start position: above first tile, offset back in Y to center tiles in frame
            keyframes.push({
              frame: panStartFrame,
              position: [firstTilePos.x, firstTilePos.y + cameraYOffset, zoomHeight],
              lookAt: [firstTilePos.x, firstTilePos.y + cameraYOffset, firstTilePos.z],
              linear: true, // Constant speed pan
            });

            // End position: above last tile
            keyframes.push({
              frame: panEndFrame,
              position: [lastTilePos.x, lastTilePos.y + cameraYOffset, zoomHeight],
              lookAt: [lastTilePos.x, lastTilePos.y + cameraYOffset, lastTilePos.z],
              linear: true, // Constant speed pan
            });

            // Hold at last tile briefly before transitioning out
            keyframes.push({
              frame: panEndFrame + 30,
              position: [lastTilePos.x, lastTilePos.y + cameraYOffset, zoomHeight],
              lookAt: [lastTilePos.x, lastTilePos.y + cameraYOffset, lastTilePos.z],
            });

            activeZoomEndFrame = panEndFrame + 30;
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

    // Log all keyframes around the INCENSE animation
    const relevantKeyframes = keyframes.filter(k => k.frame >= 300 && k.frame <= 450);
    if (relevantKeyframes.length > 0) {
      console.log('ALL KEYFRAMES (frames 300-450):');
      relevantKeyframes.forEach(k => {
        console.log(`  Frame ${k.frame}: pos.y=${k.position[1].toFixed(2)}, lookAt.y=${k.lookAt[1].toFixed(2)}`);
      });
    }

    return keyframes;
  }, [timingScript.cues, fps]);

  // Find the most recent play cue (regardless of animation state)
  const recentPlayTilesCue = useMemo(() => {
    return timingScript.cues
      .filter(cue => (cue.action === 'play_tiles' || cue.action === 'play_tiles_with_zoom') && cue.time <= currentTimeSeconds)
      .at(-1) ?? null;
  }, [currentTimeSeconds, timingScript.cues]);

  // Compute draw animation context for the current play cue
  const drawAnimContext = useMemo((): {
    plan: RackDrawPlan;
    timing: DrawPhaseTiming;
    playerIndex: number;
    animStartFrame: number;
  } | null => {
    if (!recentPlayTilesCue || recentPlayTilesCue.turnIndex === undefined) return null;

    const pIdx = recentPlayTilesCue.playerIndex !== undefined
      ? recentPlayTilesCue.playerIndex
      : recentPlayTilesCue.turnIndex % 2;

    const stateIndex = recentPlayTilesCue.turnIndex + 1;
    const state = boardStates[stateIndex];
    if (!state) return null;

    const prePlayRack = state.players[pIdx]?.rack || [];
    const playedTilesRaw = state.currentEvent?.playedTiles || '';
    if (!playedTilesRaw) return null;

    const nextCue = timingScript.cues.find(c => {
      if ((c.action !== 'play_tiles' && c.action !== 'play_tiles_with_zoom') || c.turnIndex === undefined) return false;
      if (c.turnIndex <= recentPlayTilesCue.turnIndex!) return false;
      const cPIdx = c.playerIndex !== undefined ? c.playerIndex : c.turnIndex % 2;
      return cPIdx === pIdx;
    });
    if (!nextCue || nextCue.turnIndex === undefined) return null;

    const nextTurnRack = boardStates[nextCue.turnIndex + 1]?.players[pIdx]?.rack;
    if (!nextTurnRack || nextTurnRack.length === 0) return null;

    const plan = computeRackDrawPlan(prePlayRack, playedTilesRaw, nextTurnRack);
    if (!plan) return null;

    const numTiles = state.tiles.filter(t => t.isNew).length || 1;
    const speed = recentPlayTilesCue.speed || 1.0;
    const timing = computeDrawPhaseTiming(numTiles, plan, speed);
    const animStartFrame = secondsToFrames(recentPlayTilesCue.time, fps);

    return { plan, timing, playerIndex: pIdx, animStartFrame };
  }, [recentPlayTilesCue, boardStates, timingScript.cues, fps]);

  // Check if we should show tile animations (extended through phases 1-3)
  const { isPlayingTiles, playTilesCue } = useMemo(() => {
    if (!recentPlayTilesCue || recentPlayTilesCue.turnIndex === undefined) {
      return { isPlayingTiles: false, playTilesCue: null };
    }

    const stateIndex = recentPlayTilesCue.turnIndex + 1;
    const state = boardStates[stateIndex];
    const numTiles = state?.tiles.filter(t => t.isNew).length || 0;

    const actualSpeed = recentPlayTilesCue.speed || 1.0;
    const adjustedStagger = 8 / actualSpeed;
    const springDuration = 30 / actualSpeed;
    const phase0Duration = ((numTiles - 1) * adjustedStagger + springDuration + 10) / fps;

    // Extend through phases 1-3 if we have a draw plan
    const totalDuration = drawAnimContext
      ? drawAnimContext.timing.phase3End / fps
      : phase0Duration;

    const timeSinceStart = currentTimeSeconds - recentPlayTilesCue.time;
    const stillAnimating = timeSinceStart < totalDuration;

    return {
      isPlayingTiles: stillAnimating,
      playTilesCue: stillAnimating ? recentPlayTilesCue : null
    };
  }, [currentTimeSeconds, recentPlayTilesCue, boardStates, fps, drawAnimContext]);

  // Current draw phase (null if not in a draw animation)
  const currentDrawPhase = useMemo(() => {
    if (!drawAnimContext || !isPlayingTiles) return null;
    const frameOffset = frame - drawAnimContext.animStartFrame;
    return getDrawPhase(frameOffset, drawAnimContext.timing);
  }, [drawAnimContext, isPlayingTiles, frame]);

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
              return currentBoardState.tiles.map(tile => {
                // Old tiles always render statically
                if (!tile.isNew) return tile;

                // Check if animation is complete
                if (!showTileAnimation || !playTilesCue) {
                  // Animation complete - return as static tile only if turn was animated
                  const turnThatAddedTiles = currentStateIndex - 1;
                  return animatedTurns.has(turnThatAddedTiles) ? tile : null;
                }

                // Animation in progress - add animation metadata
                // Find this tile in the displayed rack
                const nextStateIndex = playTilesCue.turnIndex + 1;
                const nextState = boardStates[nextStateIndex];
                const playerIndex = playTilesCue.turnIndex % (nextState?.players.length || 2);
                const displayedRack = nextState?.players[playerIndex]?.rack || [];

                // Get all new tiles and find this tile's play index
                const newTiles = currentBoardState.tiles.filter(t => t.isNew);
                const playIndex = newTiles.findIndex(t => t.row === tile.row && t.col === tile.col);

                // Match tiles in order to find rack index (handling duplicates)
                const usedIndices = new Set<number>();
                for (let i = 0; i < playIndex; i++) {
                  const prevTile = newTiles[i];
                  const idx = displayedRack.findIndex((letter, j) => {
                    if (usedIndices.has(j)) return false;
                    if (prevTile.blank) return letter === '?';
                    return letter.toUpperCase() === prevTile.letter.toUpperCase();
                  });
                  if (idx !== -1) usedIndices.add(idx);
                }

                // Find current tile's rack index
                let rackIndex = displayedRack.findIndex((letter, idx) => {
                  if (usedIndices.has(idx)) return false;
                  if (tile.blank) return letter === '?';
                  return letter.toUpperCase() === tile.letter.toUpperCase();
                });

                // Fallback to play order if not found
                if (rackIndex === -1) {
                  rackIndex = playIndex;
                }

                return {
                  ...tile,
                  animationSource: {
                    rackIndex,
                    animationStartFrame: secondsToFrames(playTilesCue.time, fps),
                    playIndex,
                    speed: playTilesCue.speed || 1.0,
                  }
                };
              }).filter(Boolean) as typeof currentBoardState.tiles;
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
              // Priority: end_rack > active animation > show_turn/play_tiles > overview (look ahead) > activeCue
              let cue;
              if (showEndRackAnimation) {
                cue = activeCue;
              } else if (showTileAnimation) {
                // If tiles are animating, ALWAYS use the animation cue (even if activeCue moved on)
                cue = playTilesCue;
              } else if (activeCue?.action === 'show_turn' || activeCue?.action === 'play_tiles' || activeCue?.action === 'play_tiles_with_zoom') {
                // If activeCue is explicitly showing a turn/tiles, use it
                cue = activeCue;
              } else if (activeCue?.action === 'overview') {
                // During overview, look ahead to the next show_turn or play_tiles cue
                const upcomingCue = timingScript.cues.find(c =>
                  c.time > currentTimeSeconds &&
                  (c.action === 'show_turn' || c.action === 'play_tiles' || c.action === 'play_tiles_with_zoom')
                );
                cue = upcomingCue || null;
              } else {
                cue = activeCue;
              }

              if (!cue || cue.turnIndex === undefined) return null;

              // Debug transitions (INERTIAL->RAPTNESS at 46-56s, LIVID->HAE at 54-60s)
              const debugTransition = (currentTimeSeconds >= 46 && currentTimeSeconds <= 56) ||
                                     (currentTimeSeconds >= 54 && currentTimeSeconds <= 60);
              if (debugTransition) {
                console.log(`Frame ${frame} (${currentTimeSeconds.toFixed(2)}s):`, {
                  activeCueAction: activeCue?.action,
                  activeCueTurn: activeCue?.turnIndex,
                  cueAction: cue.action,
                  cueTurn: cue.turnIndex,
                  showTileAnimation,
                  playTilesCueTurn: playTilesCue?.turnIndex,
                  activeCueMatchesCue: activeCue === cue,
                });
              }

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
                // if (cue.turnIndex === 3 && currentTimeSeconds >= 11.5 && currentTimeSeconds <= 13.5) {
                //   console.log(`Turn 3 rack debug @ ${currentTimeSeconds.toFixed(2)}s:`, {
                //     cueAction: cue.action,
                //     cueTurnIndex: cue.turnIndex,
                //     stateIndex: nextStateIndex,
                //     playerIndex: playerIndex,
                //     rackLetters: state.players[playerIndex]?.rack?.join('') || 'EMPTY',
                //     allPlayers: state.players.map((p, i) => `P${i}: ${p.rack?.join('') || 'EMPTY'}`)
                //   });
                // }
              }

              const player = state.players[playerIndex];

              // Debug rack info during transition period
              if (debugTransition) {
                console.log(`  Rack: ${player?.rack?.join('') || 'NONE'}, playerIndex: ${playerIndex}, cueTurnIndex: ${cue.turnIndex}`);
              }

              if (!player || !player.rack || player.rack.length === 0) {
                // if (cue.turnIndex === 3 && currentTimeSeconds >= 11.5 && currentTimeSeconds <= 13.5) {
                //   console.log('Turn 3 rack EMPTY - returning null:', { player: !!player, hasRack: !!player?.rack, rackLength: player?.rack?.length });
                // }
                return null;
              }

              // During animation, find which specific rack indices should be hidden (only tiles that have started animating)
              const animatedRackIndices = new Set<number>();

              // If activeCue is play_tiles and animation is complete, hide all played tiles
              // BUT only if we're showing the rack from the SAME turn (not a different rack)
              if ((activeCue?.action === 'play_tiles' || activeCue?.action === 'play_tiles_with_zoom') &&
                  !showTileAnimation &&
                  activeCue.turnIndex !== undefined &&
                  activeCue === cue) { // Only hide if showing rack from this same cue
                const stateIndex = activeCue.turnIndex + 1;
                const state = boardStates[stateIndex];
                const playedTiles = state?.tiles.filter(t => t.isNew) || [];
                const usedIndices = new Set<number>();

                if (debugTransition) {
                  console.log(`  POST-ANIM HIDING: playedTiles=${playedTiles.map(t => t.letter).join('')}, from turn ${activeCue.turnIndex}, rack=${player.rack.join('')}`);
                }

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

                if (debugTransition) {
                  console.log(`  DURING-ANIM HIDING: playedTiles=${playedTiles.map(t => t.letter).join('')}, from cue turn ${cue.turnIndex}, rack=${player.rack.join('')}, animStartFrame=${animStartFrame}, currentAnimFrame=${currentAnimFrame}`);
                }

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

              if (debugTransition && animatedRackIndices.size > 0) {
                const hiddenLetters = Array.from(animatedRackIndices).map(i => player.rack[i]).join('');
                console.log(`  HIDING rack indices: [${Array.from(animatedRackIndices).join(', ')}] = letters [${hiddenLetters}]`);
              }

              // ── Draw animation phases 1-3 ──────────────────────────────────────
              const isDrawAnimPlayer =
                drawAnimContext && drawAnimContext.playerIndex === playerIndex;
              const drawPhase = currentDrawPhase?.phase;

              if (isDrawAnimPlayer && drawPhase && drawPhase !== 'done') {
                const { plan, timing, animStartFrame } = drawAnimContext!;
                const speed = cue.speed || 1.0;

                // Phase 1: static remaining tiles in their original slots
                if (drawPhase === 1) {
                  return plan.postPlaySlots.map((letter, slotIdx) => {
                    if (letter === null) return null;
                    const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
                    return (
                      <AnimatedRackTile
                        key={`rack-tile-${slotIdx}`}
                        letter={letter}
                        value={isBlank ? 0 : getLetterValue(letter)}
                        rackIndex={slotIdx}
                        isPlayer1={playerIndex === 0}
                        tileColor={tileColor}
                      />
                    );
                  });
                }

                // Phase 2: remaining tiles + flyIn for drawn tiles
                if (drawPhase === 2) {
                  const phase2StartFrame = animStartFrame + timing.phase1End;
                  const staticPart = plan.postPlaySlots.map((letter, slotIdx) => {
                    if (letter === null) return null;
                    const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
                    return (
                      <AnimatedRackTile
                        key={`rack-tile-${slotIdx}`}
                        letter={letter}
                        value={isBlank ? 0 : getLetterValue(letter)}
                        rackIndex={slotIdx}
                        isPlayer1={playerIndex === 0}
                        tileColor={tileColor}
                      />
                    );
                  });
                  const flyInPart = plan.drawnTiles.map(dt => {
                    const isBlank = dt.letter === '?' || (dt.letter === dt.letter.toLowerCase() && dt.letter !== dt.letter.toUpperCase());
                    return (
                      <AnimatedRackTile
                        key={`rack-drawn-${dt.gapSlot}`}
                        letter={dt.letter}
                        value={isBlank ? 0 : getLetterValue(dt.letter)}
                        rackIndex={dt.gapSlot}
                        animationState={{ type: 'flyIn', startFrame: phase2StartFrame, playIndex: dt.drawOrder, speed: 1.0 }}
                        isPlayer1={playerIndex === 0}
                        tileColor={tileColor}
                      />
                    );
                  });
                  return [...staticPart, ...flyInPart];
                }

                // Phase 3: all tiles in intermediate positions, active swap animated
                if (drawPhase === 3) {
                  const intermediateSlots: string[] = plan.postPlaySlots.map(l => l ?? '');
                  for (const dt of plan.drawnTiles) intermediateSlots[dt.gapSlot] = dt.letter;

                  const phase3Offset = frame - animStartFrame - timing.phase2End;
                  const swapDuration = SWAP_DURATION; // always normal speed
                  const completedSwaps = Math.max(0, Math.floor(phase3Offset / swapDuration));
                  const currentSlots = [...intermediateSlots];
                  for (let s = 0; s < Math.min(completedSwaps, plan.swapSteps.length); s++) {
                    const step = plan.swapSteps[s];
                    [currentSlots[step.indexA], currentSlots[step.indexB]] = [currentSlots[step.indexB], currentSlots[step.indexA]];
                  }
                  const activeStep = completedSwaps < plan.swapSteps.length ? plan.swapSteps[completedSwaps] : null;
                  const phase3StartFrame = animStartFrame + timing.phase2End;
                  const hiddenSlots = new Set<number>();
                  if (activeStep) hiddenSlots.add(activeStep.indexB);

                  return currentSlots.map((letter, slotIdx) => {
                    if (!letter || hiddenSlots.has(slotIdx)) return null;
                    const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
                    const animState = (activeStep && slotIdx === activeStep.indexA)
                      ? { type: 'swap' as const, startFrame: phase3StartFrame + completedSwaps * swapDuration, playIndex: 0, speed: 1.0, targetRackIndex: activeStep.indexB }
                      : undefined;
                    return (
                      <AnimatedRackTile
                        key={`rack-tile-${slotIdx}`}
                        letter={letter}
                        value={isBlank ? 0 : getLetterValue(letter)}
                        rackIndex={slotIdx}
                        animationState={animState}
                        isPlayer1={playerIndex === 0}
                        tileColor={tileColor}
                      />
                    );
                  });
                }
              }

              // ── Phase 0 / normal: existing fly-off logic ────────────────────────
              const rackTiles = player.rack.map((letter, index) => {
                if (animatedRackIndices.has(index)) return null;

                const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
                const value = isBlank ? 0 : getLetterValue(letter);

                return (
                  <AnimatedRackTile
                    key={`rack-tile-${index}`}
                    letter={letter}
                    value={value}
                    rackIndex={index}
                    isPlayer1={playerIndex === 0}
                    tileColor={tileColor}
                  />
                );
              });

              return rackTiles;
            })()}
          </>
        )}

        {/* Tile placement animations - now handled directly by AnimatedBoardTile */}

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

          console.log('Highlighting tiles:', highlightedTiles.length, 'tiles at turn', activeCue.turnIndex);

          return highlightedTiles.map((tile, index) => {
            const position = getBoardPosition(tile.row, tile.col);
            return (
              <TileGlow
                key={`glow-${tile.row}-${tile.col}-${index}`}
                position={[position.x, position.y, position.z + 0.7]}
                size={8}
                intensity={3}
                color="#FFFF00"
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
