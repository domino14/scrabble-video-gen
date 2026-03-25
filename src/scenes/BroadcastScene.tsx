// Broadcast-style scene for professional Scrabble game visualization
// OBS-style layout with three separate 3D views (board + two racks)

import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";
import * as THREE from "three";
import { Board3DData } from "../types/board-3d-data";
import { TimingScript } from "../schemas/timing-script.schema";
import { BroadcastBoardView } from "../components/three/BroadcastBoardView";
import { CameraController, CameraKeyframe } from "../components/three/CameraController";
import { TileToScorecardAnimated } from "../components/three/TileToScorecardAnimated";
import { BroadcastLayout } from "../components/overlays/BroadcastLayout";
import { Rack } from "../components/three/Rack";
import { AnimatedRackTile } from "../components/three/AnimatedRackTile";
import { getBoardPosition, getRackPosition } from "../lib/board-coordinates";
import { secondsToFrames } from "../lib/audio-utils";
import { ExpressionType } from "../types/avatar";
import { hashString } from "../lib/avatar-generator";
import {
  computeRackDrawPlan,
  computeDrawPhaseTiming,
  getDrawPhase,
  getLetterValue,
  SWAP_DURATION,
  type RackDrawPlan,
  type DrawPhaseTiming,
} from "../lib/rack-animation-utils";
import { parseVariationTiles } from "../lib/board-coordinates";

interface BroadcastSceneProps {
  boardStates: Board3DData[];
  timingScript: TimingScript;
  tileColor?: string;
  boardColor?: string;
}

type DrawAnimContext = {
  plan: RackDrawPlan;
  timing: DrawPhaseTiming;
  playerIndex: number;
  animStartFrame: number;
  speed: number;
};

/** Compute draw-animation context for a specific player's most recent play. */
function computePlayerDrawAnimContext(
  playerIndex: number,
  cues: TimingScript["cues"],
  currentTimeSeconds: number,
  boardStates: Board3DData[],
  fps: number
): DrawAnimContext | null {
  // Most recent play cue for this player up to now
  let playerCue: (typeof cues)[number] | undefined;
  for (let i = cues.length - 1; i >= 0; i--) {
    const c = cues[i];
    if (c.time > currentTimeSeconds) continue;
    if (c.action !== "play_tiles" && c.action !== "play_tiles_with_zoom") continue;
    if (c.turnIndex === undefined) continue;
    const pIdx = c.playerIndex !== undefined ? c.playerIndex : c.turnIndex % 2;
    if (pIdx === playerIndex) { playerCue = c; break; }
  }
  if (!playerCue || playerCue.turnIndex === undefined) return null;

  const stateIndex = playerCue.turnIndex + 1;
  const state = boardStates[stateIndex];
  if (!state) return null;

  const prePlayRack = state.players[playerIndex]?.rack || [];
  const playedTilesRaw = state.currentEvent?.playedTiles || "";
  if (!playedTilesRaw) return null;

  // Find this player's NEXT play cue (to get post-draw rack)
  const nextCue = cues.find((c) => {
    if (c.action !== "play_tiles" && c.action !== "play_tiles_with_zoom") return false;
    if (c.turnIndex === undefined || c.turnIndex <= playerCue!.turnIndex!) return false;
    const pIdx = c.playerIndex !== undefined ? c.playerIndex : c.turnIndex % 2;
    return pIdx === playerIndex;
  });
  if (!nextCue || nextCue.turnIndex === undefined) return null;

  const nextTurnRack = boardStates[nextCue.turnIndex + 1]?.players[playerIndex]?.rack;
  if (!nextTurnRack || nextTurnRack.length === 0) return null;

  const plan = computeRackDrawPlan(prePlayRack, playedTilesRaw, nextTurnRack);
  if (!plan) return null;

  const numTiles = state.tiles.filter((t) => t.isNew).length || 1;
  const speed = playerCue.speed || 1.0;
  const timing = computeDrawPhaseTiming(numTiles, plan, speed);
  const animStartFrame = secondsToFrames(playerCue.time, fps);

  return { plan, timing, playerIndex, animStartFrame, speed };
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

  // Derive player expressions from recent plays
  const usePlayerExpressions = (
    timingScript: TimingScript,
    boardStates: Board3DData[],
    currentTimeSeconds: number,
    fps: number
  ): {
    player0Expression: ExpressionType;
    player0Intensity: number;
    player1Expression: ExpressionType;
    player1Intensity: number;
  } => {
    return useMemo(() => {
      // Find plays within last 2 seconds
      const recentPlays = timingScript.cues.filter(cue => {
        if (cue.action !== 'play_tiles' && cue.action !== 'play_tiles_with_zoom') return false;
        if (cue.turnIndex === undefined) return false;
        const timeSinceCue = currentTimeSeconds - cue.time;
        return timeSinceCue >= 0 && timeSinceCue <= 2;
      });

      let p0Expression: ExpressionType = 'idle';
      let p0Intensity = 0;
      let p1Expression: ExpressionType = 'idle';
      let p1Intensity = 0;

      // Post-game talking: after the last play/end_rack cue + 1s cooldown, players chat
      const lastGameCue = timingScript.cues
        .filter(c => c.action === 'play_tiles' || c.action === 'play_tiles_with_zoom' || c.action === 'end_rack')
        .at(-1);
      const talkingStartTime = lastGameCue ? lastGameCue.time + 1 : Infinity;
      if (currentTimeSeconds >= talkingStartTime) {
        const talkInterval = 2.5; // seconds each player talks
        const elapsed = currentTimeSeconds - talkingStartTime;
        const speakerIndex = Math.floor(elapsed / talkInterval) % 2;
        const phaseProgress = (elapsed % talkInterval) / talkInterval;
        // Fade in/out within each turn
        const talkIntensity = phaseProgress < 0.1
          ? phaseProgress / 0.1
          : phaseProgress > 0.9
            ? (1 - phaseProgress) / 0.1
            : 1;

        if (speakerIndex === 0) {
          p0Expression = 'talking';
          p0Intensity = talkIntensity;
          p1Expression = 'happy';
          p1Intensity = talkIntensity * 0.4;
        } else {
          p1Expression = 'talking';
          p1Intensity = talkIntensity;
          p0Expression = 'happy';
          p0Intensity = talkIntensity * 0.4;
        }

        return {
          player0Expression: p0Expression,
          player0Intensity: p0Intensity,
          player1Expression: p1Expression,
          player1Intensity: p1Intensity,
        };
      }

      // Check most recent play for expression triggers
      const mostRecentPlay = recentPlays.at(-1);
      if (mostRecentPlay && mostRecentPlay.turnIndex !== undefined) {
        const stateIndex = mostRecentPlay.turnIndex + 1;
        const state = boardStates[stateIndex];
        const event = state?.currentEvent;

        if (event) {
          // Determine who played
          const playerIndex = mostRecentPlay.playerIndex !== undefined
            ? mostRecentPlay.playerIndex
            : mostRecentPlay.turnIndex % 2;

          // Calculate fade in/out based on time since play
          const timeSincePlay = currentTimeSeconds - mostRecentPlay.time;
          const fadeInDuration = 0.5; // 0.5 seconds fade in
          const holdDuration = 2.0; // 2 seconds hold
          const fadeOutDuration = 0.5; // 0.5 seconds fade out

          let intensity = 0;
          if (timeSincePlay < fadeInDuration) {
            // Fade in
            intensity = timeSincePlay / fadeInDuration;
          } else if (timeSincePlay < holdDuration) {
            // Hold
            intensity = 1;
          } else if (timeSincePlay < holdDuration + fadeOutDuration) {
            // Fade out
            intensity = 1 - ((timeSincePlay - holdDuration) / fadeOutDuration);
          }

          // Big score (bingo or 50+ points)
          if (event.isBingo || event.score >= 50) {
            // Player who scored is happy
            if (playerIndex === 0) {
              p0Expression = 'happy';
              p0Intensity = intensity;
            } else {
              p1Expression = 'happy';
              p1Intensity = intensity;
            }

            // Opponent gets angry/eye_roll (deterministic per opponent+turn) if score >= 60, otherwise sad
            if (event.score >= 60) {
              const opponentIndex = playerIndex === 0 ? 1 : 0;
              const opponentNickname = state.players[opponentIndex]?.nickname ?? '';
              const angryVariant: ExpressionType =
                hashString(opponentNickname + mostRecentPlay.turnIndex) % 2 === 0
                  ? 'angry'
                  : 'eye_roll';
              if (playerIndex === 0) {
                p1Expression = angryVariant;
                p1Intensity = intensity * 0.8;
              } else {
                p0Expression = angryVariant;
                p0Intensity = intensity * 0.8;
              }
            } else {
              if (playerIndex === 0) {
                p1Expression = 'sad';
                p1Intensity = intensity * 0.6;
              } else {
                p0Expression = 'sad';
                p0Intensity = intensity * 0.6;
              }
            }
          }
        }
      }

      return {
        player0Expression: p0Expression,
        player0Intensity: p0Intensity,
        player1Expression: p1Expression,
        player1Intensity: p1Intensity,
      };
    }, [timingScript, boardStates, currentTimeSeconds, fps]);
  };

  const { player0Expression, player0Intensity, player1Expression, player1Intensity } =
    usePlayerExpressions(timingScript, boardStates, currentTimeSeconds, fps);

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
    // For show_variation and highlight_region, show the board at turnIndex (like show_turn)
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

  // Per-player draw animation contexts — independent so each rack animates freely
  // even while the other player is taking their turn.
  const drawAnimCtx0 = useMemo(
    () => computePlayerDrawAnimContext(0, timingScript.cues, currentTimeSeconds, boardStates, fps),
    [timingScript.cues, currentTimeSeconds, boardStates, fps]
  );
  const drawAnimCtx1 = useMemo(
    () => computePlayerDrawAnimContext(1, timingScript.cues, currentTimeSeconds, boardStates, fps),
    [timingScript.cues, currentTimeSeconds, boardStates, fps]
  );

  const showTileAnimation = useMemo(() => {
    if (!playTilesCue || playTilesCue.turnIndex === undefined) return false;

    // Phase 0 only: tiles flying from rack to board
    const stateIndex = playTilesCue.turnIndex + 1;
    const state = boardStates[stateIndex];
    const numTiles = state?.tiles.filter(t => t.isNew).length || 0;
    const actualSpeed = playTilesCue.speed || 1.0;
    const adjustedStagger = 8 / actualSpeed;
    const springDuration = 30 / actualSpeed;
    const animationDurationFrames = (numTiles - 1) * adjustedStagger + springDuration + 10;

    const animStartFrame = secondsToFrames(playTilesCue.time, fps);
    return frame >= animStartFrame && frame < animStartFrame + animationDurationFrames;
  }, [playTilesCue, frame, fps, boardStates]);

  const showEndRackAnimation = activeCue?.action === 'end_rack' && !!currentBoardState.currentEvent;

  // Compute variation tiles, opacity, and style — supports fade-in and fade-out
  const { variationTiles, variationOpacity, variationPlayerIndex, variationTileColor, variationTextColor } = useMemo(() => {
    const fadeDuration = 15; // frames
    const fadeDurationSecs = fadeDuration / fps;

    // Find the most recent show_variation cue whose fade window covers the current time
    let lastVariationCue: (typeof timingScript.cues)[number] | undefined;
    let lastVariationCueIdx = -1;
    for (let i = timingScript.cues.length - 1; i >= 0; i--) {
      const c = timingScript.cues[i];
      if (c.action !== 'show_variation' || !c.variation) continue;
      const nextCue = timingScript.cues[i + 1];
      const endTime = nextCue ? nextCue.time + fadeDurationSecs : Infinity;
      if (c.time <= currentTimeSeconds && currentTimeSeconds <= endTime) {
        lastVariationCue = c;
        lastVariationCueIdx = i;
        break;
      }
    }

    if (!lastVariationCue?.variation) {
      return { variationTiles: undefined, variationOpacity: 0, variationPlayerIndex: -1, variationTileColor: undefined, variationTextColor: undefined };
    }

    const tiles = parseVariationTiles(lastVariationCue.variation.position, lastVariationCue.variation.word);
    const cueStartFrame = secondsToFrames(lastVariationCue.time, fps);
    const nextCue = timingScript.cues[lastVariationCueIdx + 1];
    const nextCueStartFrame = nextCue ? secondsToFrames(nextCue.time, fps) : Infinity;

    let opacity: number;
    if (frame < cueStartFrame + fadeDuration) {
      opacity = Math.min(1, Math.max(0, (frame - cueStartFrame) / fadeDuration));
    } else if (frame >= nextCueStartFrame) {
      opacity = Math.min(1, Math.max(0, 1 - (frame - nextCueStartFrame) / fadeDuration));
    } else {
      opacity = 1;
    }

    const playerIndex = lastVariationCue.playerIndex !== undefined
      ? lastVariationCue.playerIndex
      : (lastVariationCue.turnIndex !== undefined ? lastVariationCue.turnIndex % 2 : 0);

    return {
      variationTiles: tiles,
      variationOpacity: opacity,
      variationPlayerIndex: playerIndex,
      variationTileColor: lastVariationCue.variationStyle?.tileColor,
      variationTextColor: lastVariationCue.variationStyle?.textColor,
    };
  }, [frame, fps, timingScript.cues, currentTimeSeconds]);

  /**
   * Compute which indices to hide from a specific displayed rack.
   * Must match against the actual displayed rack (not board-state rack) to avoid index mismatch.
   */
  const getVariationHiddenIndices = (displayedRack: string[]): Set<number> => {
    if (!variationTiles || variationOpacity <= 0) return new Set();
    const hidden = new Set<number>();
    const usedIdx = new Set<number>();
    for (const tile of variationTiles) {
      const isBlank = tile.letter === tile.letter.toLowerCase() && tile.letter !== tile.letter.toUpperCase();
      const idx = displayedRack.findIndex((l, i) => {
        if (usedIdx.has(i)) return false;
        if (isBlank) return l === '?';
        return l.toUpperCase() === tile.letter.toUpperCase();
      });
      if (idx !== -1) { hidden.add(idx); usedIdx.add(idx); }
    }
    return hidden;
  };

  // Compute highlight region and opacity
  const { highlightRegion, highlightOpacity } = useMemo(() => {
    if (activeCue?.action !== 'highlight_region' || !activeCue.highlightRegion) {
      return { highlightRegion: undefined, highlightOpacity: 0 };
    }
    const cueStartFrame = secondsToFrames(activeCue.time, fps);
    const fadeDuration = 15;
    const opacity = Math.min(1, Math.max(0, (frame - cueStartFrame) / fadeDuration));
    return { highlightRegion: activeCue.highlightRegion, highlightOpacity: opacity };
  }, [activeCue, frame, fps]);

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
                speed: playTilesCue.speed || 1.0,
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


  // Who just played (regardless of whether animation is still running)
  const lastPlayedPlayerIndex = useMemo(() => {
    if (!playTilesCue || playTilesCue.turnIndex === undefined) return -1;
    return playTilesCue.playerIndex !== undefined
      ? playTilesCue.playerIndex
      : playTilesCue.turnIndex % 2;
  }, [playTilesCue]);

  // Onturn indicator: during animation show the playing player; outside animation
  // show whoever is next to play (by scanning upcoming cues), so consecutive same-player
  // turns don't bounce. During end_rack show the giving player; after end_rack nobody.
  const onturnPlayerIndex = useMemo(() => {
    const endRackCue = timingScript.cues.find(c => c.action === 'end_rack');

    // During end_rack: show the giving player (opponent of who went out)
    if (activeCue?.action === 'end_rack') {
      return lastPlayedPlayerIndex >= 0 ? 1 - lastPlayedPlayerIndex : -1;
    }
    // After end_rack animation ends: game over
    if (endRackCue && currentTimeSeconds >= endRackCue.time) return -1;

    // During tile animation: the placing player is on turn
    if (showTileAnimation && lastPlayedPlayerIndex >= 0) return lastPlayedPlayerIndex;

    // Outside animation: find the next upcoming cue that carries a playerIndex
    const nextCue = timingScript.cues.find(c =>
      c.time > currentTimeSeconds &&
      c.playerIndex !== undefined &&
      (c.action === 'show_turn' || c.action === 'play_tiles' || c.action === 'play_tiles_with_zoom')
    );
    if (nextCue?.playerIndex !== undefined) return nextCue.playerIndex;

    // No more plays coming — game is ending; show opponent of last player
    if (lastPlayedPlayerIndex >= 0) return 1 - lastPlayedPlayerIndex;
    return currentBoardState.players.findIndex(p => p.onturn);
  }, [showTileAnimation, lastPlayedPlayerIndex, currentBoardState, timingScript.cues, currentTimeSeconds, activeCue]);

  // ALWAYS use per-player lookup for rack display
  // This ensures each player's rack is shown from their correct state
  const { player0Rack, player1Rack, player1, player2 } = useMemo(() => {
    const getPlayerRackState = (playerIndex: number) => {
      // During animation for THIS player: use the animation cue's state (pre-play rack)
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

    // After end_rack animation completes, both racks should be empty (game over)
    const endRackCue = timingScript.cues.find(c => c.action === 'end_rack');
    const postGame = !showEndRackAnimation && endRackCue !== undefined && currentTimeSeconds >= endRackCue.time;

    return {
      player0Rack: postGame ? [] : (p1?.rack || []),
      player1Rack: postGame ? [] : (p2?.rack || []),
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
    showEndRackAnimation,
  ]);

  // Helper to calculate animated rack indices with their play order
  // Returns a Map of rackIndex → playIndex for correct animation timing
  const getAnimatedRackMap = (playerIndex: number): Map<number, number> => {
    // Handle end_rack: hide tiles from the giving player's rack as they animate away
    if (showEndRackAnimation && activeCue?.turnIndex !== undefined) {
      const endRackState = boardStates[activeCue.turnIndex];
      const receivingPlayerIndex = endRackState?.players.findIndex(p => p.onturn) ?? -1;
      const givingPlayerIndex = (receivingPlayerIndex + 1) % 2;
      if (playerIndex !== givingPlayerIndex || !currentBoardState.currentEvent) return new Map();

      const rackLetters = currentBoardState.currentEvent.playedTiles.split('');
      const givingRack = endRackState?.players[givingPlayerIndex]?.rack || [];
      const speed = activeCue.speed || 1.0;
      const adjustedStagger = 8 / speed;
      const startFrame = secondsToFrames(activeCue.time, fps);
      const currentAnimFrame = frame - startFrame;
      const map = new Map<number, number>();
      const usedIndices = new Set<number>();

      rackLetters.forEach((letter, tileIndex) => {
        if (currentAnimFrame >= tileIndex * adjustedStagger) {
          const rackIndex = givingRack.findIndex((l, idx) => !usedIndices.has(idx) && l === letter);
          if (rackIndex !== -1) {
            map.set(rackIndex, tileIndex);
            usedIndices.add(rackIndex);
          }
        }
      });
      return map;
    }

    if (!showTileAnimation || playingPlayerIndex !== playerIndex || !playTilesCue) {
      return new Map();
    }

    // Get stable rack from boardStates for matching (PRE-PLAY rack)
    const stateIndex = playTilesCue.turnIndex + 1;
    const stableRack = boardStates[stateIndex]?.players[playerIndex]?.rack || [];

    const rackIndexToPlayIndex = new Map<number, number>();
    const playedTiles = currentBoardState.tiles.filter((t) => t.isNew);
    const TILE_STAGGER = 8;
    const speed = playTilesCue.speed || 1.0;
    const adjustedStagger = TILE_STAGGER / speed;
    const startFrame = secondsToFrames(playTilesCue.time, fps);
    const currentAnimFrame = frame - startFrame;

    // Build mapping by matching ALL tiles up to current animation frame
    // This ensures correct matching for duplicate letters
    const usedIndices = new Set<number>();
    playedTiles.forEach((tile, playIndex) => {
      const tileStartFrame = playIndex * adjustedStagger;
      if (currentAnimFrame >= tileStartFrame) {
        // Find this tile's rack index, excluding already-used indices
        const rackIndex = stableRack.findIndex((letter, idx) => {
          if (usedIndices.has(idx)) return false;
          if (tile.blank) return letter === "?";
          return letter.toUpperCase() === tile.letter.toUpperCase();
        });

        if (rackIndex !== -1) {
          rackIndexToPlayIndex.set(rackIndex, playIndex);
          usedIndices.add(rackIndex);
        }
      }
    });

    return rackIndexToPlayIndex;
  };

  // Derive animation cue and timing for rack tiles (handles both play_tiles and end_rack)
  const rackAnimCue = showEndRackAnimation ? activeCue : (showTileAnimation ? playTilesCue : null);

  // Build draw-animation phase tiles for the animating player (phases 1-3)
  type RackTileData = {
    letter: string;
    value: number;
    rackIndex: number;
    animationState?: {
      type?: 'flyOff' | 'flyIn' | 'swap';
      startFrame: number;
      playIndex: number;
      speed: number;
      targetRackIndex?: number;
    };
  };

  const buildDrawPhaseTiles = (playerIndex: number): RackTileData[] | null => {
    const ctx = playerIndex === 0 ? drawAnimCtx0 : drawAnimCtx1;
    if (!ctx) return null;

    const frameOffset = frame - ctx.animStartFrame;
    // Only active during phases 1-3 (after fly-off, before animation ends)
    if (frameOffset < ctx.timing.phase0End || frameOffset >= ctx.timing.phase3End) return null;

    const drawPhaseInfo = getDrawPhase(frameOffset, ctx.timing);
    if (drawPhaseInfo.phase === 0 || drawPhaseInfo.phase === 'done') return null;

    const { plan, timing, animStartFrame, speed } = ctx;
    const phase = drawPhaseInfo.phase;

    // Build postPlaySlots letters (non-null slots stay in their original positions)
    const staticTiles: RackTileData[] = plan.postPlaySlots.flatMap((letter, slotIdx) => {
      if (letter === null) return [];
      const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
      return [{ letter, value: isBlank ? 0 : getLetterValue(letter), rackIndex: slotIdx }];
    });

    if (phase === 1) {
      return staticTiles;
    }

    if (phase === 2) {
      // Static remaining tiles + flyIn for drawn tiles
      const phase2StartFrame = animStartFrame + timing.phase1End;
      const tiles = [...staticTiles];
      for (const dt of plan.drawnTiles) {
        const isBlank = dt.letter === '?' || (dt.letter === dt.letter.toLowerCase() && dt.letter !== dt.letter.toUpperCase());
        tiles.push({
          letter: dt.letter,
          value: isBlank ? 0 : getLetterValue(dt.letter),
          rackIndex: dt.gapSlot,
          animationState: {
            type: 'flyIn' as const,
            startFrame: phase2StartFrame,
            playIndex: dt.drawOrder,
            speed: 1.0,
          },
        });
      }
      return tiles;
    }

    if (phase === 3) {
      // Build intermediate rack (postPlaySlots + drawn tiles filled in)
      const intermediateSlots: string[] = plan.postPlaySlots.map(l => l ?? '');
      for (const dt of plan.drawnTiles) intermediateSlots[dt.gapSlot] = dt.letter;

      // Determine which swaps have completed and apply them
      const phase3Offset = frame - animStartFrame - timing.phase2End;
      const swapDuration = SWAP_DURATION; // always normal speed
      const completedSwaps = Math.max(0, Math.floor(phase3Offset / swapDuration));
      const currentSlots = [...intermediateSlots];
      for (let s = 0; s < Math.min(completedSwaps, plan.swapSteps.length); s++) {
        const step = plan.swapSteps[s];
        [currentSlots[step.indexA], currentSlots[step.indexB]] = [currentSlots[step.indexB], currentSlots[step.indexA]];
      }

      // Active swap (in progress)
      const activeStep = completedSwaps < plan.swapSteps.length ? plan.swapSteps[completedSwaps] : null;
      const hiddenSlots = new Set<number>();
      if (activeStep) hiddenSlots.add(activeStep.indexB); // target slot hidden while tile slides in

      const phase3StartFrame = animStartFrame + timing.phase2End;

      return currentSlots.flatMap((letter, slotIdx): RackTileData[] => {
        if (!letter) return [];
        if (hiddenSlots.has(slotIdx)) return [];

        const isBlank = letter === '?' || (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
        const base: RackTileData = { letter, value: isBlank ? 0 : getLetterValue(letter), rackIndex: slotIdx };

        if (activeStep && slotIdx === activeStep.indexA) {
          return [{
            ...base,
            animationState: {
              type: 'swap' as const,
              startFrame: phase3StartFrame + completedSwaps * swapDuration,
              playIndex: 0,
              speed: 1.0,
              targetRackIndex: activeStep.indexB,
            },
          }];
        }
        return [base];
      });
    }

    return null;
  };

  // Convert racks to tile data with animation state
  const player1RackTiles = useMemo((): RackTileData[] => {
    // Phases 1-3: use draw-animation tiles
    const drawTiles = buildDrawPhaseTiles(0);
    if (drawTiles !== null) return drawTiles;

    // Phase 0 / normal: use fly-off logic
    const animatedRackMap = getAnimatedRackMap(0);
    // Match variation tiles against this exact displayed rack to get correct hidden indices
    const hiddenIndices = variationPlayerIndex === 0 ? getVariationHiddenIndices(player0Rack) : new Set<number>();
    return player0Rack
      .map((letter, i) => {
        if (hiddenIndices.has(i)) return null;
        const isBlank =
          letter === "?" ||
          (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
        const value = isBlank ? 0 : getLetterValue(letter);
        const playIndex = animatedRackMap.get(i);
        const isAnimated = playIndex !== undefined;
        return {
          letter,
          value,
          rackIndex: i,
          animationState:
            isAnimated && rackAnimCue
              ? { type: 'flyOff' as const, startFrame: secondsToFrames(rackAnimCue.time, fps), playIndex, speed: rackAnimCue.speed || 1.0 }
              : undefined,
        };
      })
      .filter(Boolean) as RackTileData[];
  }, [player0Rack, playingPlayerIndex, showTileAnimation, showEndRackAnimation, rackAnimCue, boardStates, currentBoardState.tiles, frame, fps, drawAnimCtx0, variationTiles, variationOpacity, variationPlayerIndex]);

  const player2RackTiles = useMemo((): RackTileData[] => {
    // Phases 1-3: use draw-animation tiles
    const drawTiles = buildDrawPhaseTiles(1);
    if (drawTiles !== null) return drawTiles;

    // Phase 0 / normal: use fly-off logic
    const animatedRackMap = getAnimatedRackMap(1);
    // Match variation tiles against this exact displayed rack to get correct hidden indices
    const hiddenIndices = variationPlayerIndex === 1 ? getVariationHiddenIndices(player1Rack) : new Set<number>();
    return player1Rack
      .map((letter, i) => {
        if (hiddenIndices.has(i)) return null;
        const isBlank =
          letter === "?" ||
          (letter === letter.toLowerCase() && letter !== letter.toUpperCase());
        const value = isBlank ? 0 : getLetterValue(letter);
        const playIndex = animatedRackMap.get(i);
        const isAnimated = playIndex !== undefined;
        return {
          letter,
          value,
          rackIndex: i,
          animationState:
            isAnimated && rackAnimCue
              ? { type: 'flyOff' as const, startFrame: secondsToFrames(rackAnimCue.time, fps), playIndex, speed: rackAnimCue.speed || 1.0 }
              : undefined,
        };
      })
      .filter(Boolean) as RackTileData[];
  }, [player1Rack, playingPlayerIndex, showTileAnimation, showEndRackAnimation, rackAnimCue, boardStates, currentBoardState.tiles, frame, fps, drawAnimCtx1, variationTiles, variationOpacity, variationPlayerIndex]);

  // Debug: comprehensive logging with duplicate letter tracking
  if (frame % 5 === 0 && showTileAnimation && playTilesCue?.turnIndex === 3) {
    // Focus on turn 3 (INCENSE) every 5 frames during animation
    console.log(`\n=== Frame ${frame} (turn ${playTilesCue.turnIndex}) ===`);
    const stateIndex = playTilesCue.turnIndex + 1;
    const stableRack = boardStates[stateIndex]?.players[playingPlayerIndex]?.rack || [];
    const displayedRack = playingPlayerIndex === 0 ? player0Rack : player1Rack;

    console.log('Stable rack:', stableRack.join(''));
    console.log('Displayed rack:', displayedRack.join(''));
    console.log('Racks match:', stableRack.join('') === displayedRack.join(''));

    const playedTiles = currentBoardState.tiles.filter(t => t.isNew);
    console.log('Played tiles:', playedTiles.map(t => `${t.letter}${t.blank ? '(blank)' : ''}`).join(', '));

    const rackTiles = playingPlayerIndex === 0 ? player1RackTiles : player2RackTiles;
    const animating = rackTiles
      .map((t, i) => ({ idx: i, letter: t.letter, animating: !!t.animationState }))
      .filter(t => t.animating);
    console.log('Animating indices:', animating.map(t => `${t.idx}:${t.letter}`).join(', '));
  }

  // Tile pool board state: during animation, use the board BEFORE the animating player's
  // play so their tiles don't count as both "on rack" and "on board". Outside of animation,
  // use currentBoardState directly so the bag+unseen updates as soon as the turn switches.
  const tilePoolBoardState = useMemo(() => {
    if (!showTileAnimation || !playTilesCue || playTilesCue.turnIndex === undefined) {
      return currentBoardState;
    }

    // During animation: board from before this play, racks from after
    const boardStateBeforePlay = boardStates[playTilesCue.turnIndex] || boardStates[0];
    const rackState = boardStates[playTilesCue.turnIndex + 1] || currentBoardState;

    return {
      ...boardStateBeforePlay,
      players: rackState.players.map(p => ({ ...p })),
    };
  }, [showTileAnimation, playTilesCue, currentBoardState, boardStates]);

  // Generate camera keyframes for the broadcast board view
  const broadcastCameraKeyframes = useMemo((): CameraKeyframe[] => {
    const keyframes: CameraKeyframe[] = [
      { frame: 0, position: [0, 0, 100], lookAt: [0, 0, 0] },
    ];
    let activeZoomEndFrame = -1;

    timingScript.cues.forEach((cue) => {
      const cueFrame = secondsToFrames(cue.time, fps);

      if (cue.action === 'overview') {
        keyframes.push({ frame: Math.max(cueFrame, activeZoomEndFrame + 1), position: [0, 0, 100], lookAt: [0, 0, 0] });
      } else if (cue.action === 'play_tiles_with_zoom' && cue.turnIndex !== undefined) {
        const stateIndex = cue.turnIndex + 1;
        const state = boardStates[stateIndex];
        if (!state) return;

        let newTiles = state.tiles.filter(t => t.isNew);
        if (newTiles.length === 0) return;

        const isVertical = newTiles.every(t => t.col === newTiles[0].col);
        if (isVertical) {
          newTiles = [...newTiles].sort((a, b) => a.row - b.row);
        } else {
          newTiles = [...newTiles].sort((a, b) => a.col - b.col);
        }

        const animSpeed = cue.speed || 1.0;
        const staggerFrames = 8 / animSpeed;
        const tileFallTime = 30 / animSpeed;

        const firstTilePos = getBoardPosition(newTiles[0].row, newTiles[0].col);
        const lastTilePos = getBoardPosition(newTiles[newTiles.length - 1].row, newTiles[newTiles.length - 1].col);
        const zoomHeight = cue.zoomHeight || 40;
        const panEndFrame = cueFrame + (newTiles.length - 1) * staggerFrames + tileFallTime;

        keyframes.push({
          frame: cueFrame,
          position: [firstTilePos.x, firstTilePos.y, zoomHeight],
          lookAt: [firstTilePos.x, firstTilePos.y, 0],
          linear: true,
        });
        keyframes.push({
          frame: panEndFrame,
          position: [lastTilePos.x, lastTilePos.y, zoomHeight],
          lookAt: [lastTilePos.x, lastTilePos.y, 0],
          linear: true,
        });
        keyframes.push({
          frame: panEndFrame + 30,
          position: [lastTilePos.x, lastTilePos.y, zoomHeight],
          lookAt: [lastTilePos.x, lastTilePos.y, 0],
        });

        activeZoomEndFrame = panEndFrame + 30;
      }
    });

    return keyframes.sort((a, b) => a.frame - b.frame);
  }, [timingScript.cues, fps, boardStates]);

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
            <CameraController keyframes={broadcastCameraKeyframes} />
            <BroadcastBoardView
              data={boardDataWithAnimations}
              tileColor={tileColor}
              boardColor={boardColor}
              variationTiles={variationTiles}
              variationOpacity={variationOpacity}
              variationTileColor={variationTileColor}
              variationTextColor={variationTextColor}
              highlightRegion={highlightRegion}
              highlightOpacity={highlightOpacity}
            />
            {showEndRackAnimation && activeCue?.turnIndex !== undefined && (() => {
              const endRackState = boardStates[activeCue.turnIndex];
              if (!endRackState || !currentBoardState.currentEvent) return null;

              const receivingPlayerIndex = endRackState.players.findIndex(p => p.onturn);
              const givingPlayerIndex = (receivingPlayerIndex + 1) % 2;
              const givingPlayer = endRackState.players[givingPlayerIndex];
              const rackLetters = currentBoardState.currentEvent.playedTiles.split('');
              const animStartFrame = secondsToFrames(activeCue.time, fps);
              const speed = activeCue.speed || 1.0;

              return rackLetters.map((letter, tileIndex) => {
                const usedIndices = new Set<number>();
                for (let i = 0; i < tileIndex; i++) {
                  const idx = givingPlayer?.rack.findIndex((l, j) => !usedIndices.has(j) && l === rackLetters[i]) ?? -1;
                  if (idx !== -1) usedIndices.add(idx);
                }
                let rackIndex = givingPlayer?.rack.findIndex((l, idx) => !usedIndices.has(idx) && l === letter) ?? -1;
                if (rackIndex === -1) rackIndex = tileIndex;

                const startPos = getRackPosition(rackIndex);
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
                    speed={speed}
                  />
                );
              });
            })()}
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
                  (onturnPlayerIndex === 0 ? "#4CAF50" : "rgba(255, 255, 255, 0.2)"),
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
                  (onturnPlayerIndex === 0 ? "#4CAF50" : "rgba(255, 255, 255, 0.3)"),
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
                style={{ backgroundColor: "#B5A090" }}
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
                  (onturnPlayerIndex === 1 ? "#4CAF50" : "rgba(255, 255, 255, 0.2)"),
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
                  (onturnPlayerIndex === 1 ? "#4CAF50" : "rgba(255, 255, 255, 0.3)"),
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
                style={{ backgroundColor: "#B5A090" }}
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
        player0Rack={player0Rack}
        player1Rack={player1Rack}
        tileColor={tileColor}
        onturnPlayerIndex={onturnPlayerIndex}
        showMoveNotation={
          currentBoardState.currentEvent &&
          (activeCue?.action === "play_tiles" ||
            activeCue?.action === "play_tiles_with_zoom")
        }
        moveNotationStartFrame={
          activeCue ? secondsToFrames(activeCue.time, fps) : 0
        }
        player0Expression={player0Expression}
        player0ExpressionIntensity={player0Intensity}
        player1Expression={player1Expression}
        player1ExpressionIntensity={player1Intensity}
        currentFrame={frame}
      />
    </>
  );
};
