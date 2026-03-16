// Shared rack draw animation utilities
// Used by BroadcastScene and BoardScene for the post-play tile draw animation

export const GAP_PAUSE = 8;         // frames rack shows gaps before new tiles fly in
export const DRAW_STAGGER = 10;     // frames between successive tile fly-ins
export const DRAW_FLY_DURATION = 18; // frames for one tile to fly into rack
export const SWAP_DURATION = 12;    // frames per sequential swap step

const FLY_OFF_STAGGER = 8;          // matches TILE_STAGGER in AnimatedRackTile
const SPRING_DURATION = 30;         // approximate spring settle for fly-off

export interface DrawnTileInfo {
  letter: string;
  gapSlot: number;   // rack slot index (0-6) that this tile flies into
  drawOrder: number; // stagger index (0, 1, 2, …)
}

export interface SwapStep {
  indexA: number;    // source slot
  indexB: number;    // destination slot
  stepIndex: number; // sequential order
}

export interface RackDrawPlan {
  postPlaySlots: (string | null)[]; // 7-slot array after tiles left; null = gap
  drawnTiles: DrawnTileInfo[];
  swapSteps: SwapStep[];
  finalRack: string[];              // target order from JSON (next turn's rack)
}

export interface DrawPhaseTiming {
  phase0End: number; // end of fly-off phase (frame offset from cue start)
  phase1End: number; // end of gap-pause phase
  phase2End: number; // end of draw-in phase
  phase3End: number; // end of swap phase
}

export function getLetterValue(letter: string): number {
  if (letter === letter.toLowerCase() && letter !== letter.toUpperCase()) {
    return 0; // blank
  }
  const values: Record<string, number> = {
    A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1,
    D: 2, G: 2,
    B: 3, C: 3, M: 3, P: 3,
    F: 4, H: 4, V: 4, W: 4, Y: 4,
    K: 5,
    J: 8, X: 8,
    Q: 10, Z: 10,
  };
  return values[letter.toUpperCase()] || 0;
}

/**
 * Compute sequential swap steps (selection-sort style) to transform
 * intermediateRack into finalRack.
 */
export function computeSwapSequence(
  intermediateRack: string[],
  finalRack: string[]
): SwapStep[] {
  const current = [...intermediateRack];
  const steps: SwapStep[] = [];

  for (let i = 0; i < current.length; i++) {
    if (current[i] === finalRack[i]) continue;
    // Find the tile that belongs at position i (search rightward)
    let j = -1;
    for (let k = i + 1; k < current.length; k++) {
      if (current[k] === finalRack[i]) {
        j = k;
        break;
      }
    }
    if (j === -1) continue; // shouldn't happen if racks are same multiset
    steps.push({ indexA: i, indexB: j, stepIndex: steps.length });
    [current[i], current[j]] = [current[j], current[i]];
  }

  return steps;
}

/**
 * Given the pre-play rack, played tiles string (may contain dots), and the next
 * turn's rack, compute everything needed to animate the draw sequence.
 * Returns null if there's nothing to animate (no tiles drawn, or last turn).
 */
export function computeRackDrawPlan(
  prePlayRack: string[],
  playedTilesRaw: string,
  nextTurnRack: string[]
): RackDrawPlan | null {
  if (!nextTurnRack || nextTurnRack.length === 0) return null;

  // Strip dots; map lowercase tile letters to '?' (blank)
  const playedLetters = playedTilesRaw
    .split('')
    .filter(c => c !== '.')
    .map(c => (c !== '?' && c === c.toLowerCase() && c !== c.toUpperCase()) ? '?' : c);

  if (playedLetters.length === 0) return null;

  // Build postPlaySlots by nulling out each played tile in the pre-play rack
  const slots: (string | null)[] = [...prePlayRack];
  const usedSlots = new Set<number>();

  for (const played of playedLetters) {
    const idx = slots.findIndex((l, i) => {
      if (usedSlots.has(i) || l === null) return false;
      return l === played;
    });
    if (idx !== -1) {
      slots[idx] = null;
      usedSlots.add(idx);
    }
  }

  // Diff remaining letters against nextTurnRack to find drawn tiles
  const remaining = slots.filter((l): l is string => l !== null);
  const tempNext = [...nextTurnRack];

  for (const letter of remaining) {
    const idx = tempNext.findIndex(l => l === letter);
    if (idx !== -1) tempNext.splice(idx, 1);
  }
  const drawnLetters = tempNext; // what's left = newly drawn

  if (drawnLetters.length === 0) return null; // nothing was drawn

  // Assign drawn tiles to gap slots left-to-right
  const gapSlots: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null) gapSlots.push(i);
  }

  const drawnTiles: DrawnTileInfo[] = drawnLetters.map((letter, drawOrder) => ({
    letter,
    gapSlot: gapSlots[drawOrder] ?? drawOrder,
    drawOrder,
  }));

  // Build intermediate rack (all 7 slots filled after draw, before sort)
  const intermediateSlots: string[] = slots.map(l => l ?? '');
  for (const dt of drawnTiles) {
    intermediateSlots[dt.gapSlot] = dt.letter;
  }

  // Compute swap sequence from intermediate to final order
  const swapSteps = computeSwapSequence(intermediateSlots, nextTurnRack);

  return {
    postPlaySlots: slots,
    drawnTiles,
    swapSteps,
    finalRack: nextTurnRack,
  };
}

/**
 * Compute frame offsets (relative to cue start) for each animation phase boundary.
 */
export function computeDrawPhaseTiming(
  numPlayedTiles: number,
  plan: RackDrawPlan,
  speed: number
): DrawPhaseTiming {
  const adj = (n: number) => n / speed;

  const phase0End =
    (numPlayedTiles - 1) * adj(FLY_OFF_STAGGER) + adj(SPRING_DURATION) + 10;

  const phase1End = phase0End + adj(GAP_PAUSE);

  const numDrawn = plan.drawnTiles.length;
  const phase2End =
    numDrawn > 0
      ? phase1End + (numDrawn - 1) * adj(DRAW_STAGGER) + adj(DRAW_FLY_DURATION)
      : phase1End;

  const phase3End =
    plan.swapSteps.length > 0
      ? phase2End + plan.swapSteps.length * adj(SWAP_DURATION)
      : phase2End;

  return { phase0End, phase1End, phase2End, phase3End };
}

/**
 * Given a frame offset from cue start and the phase timing, return the current
 * phase and a 0-1 progress within that phase.
 */
export function getDrawPhase(
  frameOffset: number,
  timing: DrawPhaseTiming
): { phase: 0 | 1 | 2 | 3 | 'done'; phaseProgress: number } {
  if (frameOffset < timing.phase0End) {
    return { phase: 0, phaseProgress: frameOffset / Math.max(1, timing.phase0End) };
  }
  if (frameOffset < timing.phase1End) {
    const dur = timing.phase1End - timing.phase0End;
    return { phase: 1, phaseProgress: (frameOffset - timing.phase0End) / Math.max(1, dur) };
  }
  if (frameOffset < timing.phase2End) {
    const dur = timing.phase2End - timing.phase1End;
    return { phase: 2, phaseProgress: (frameOffset - timing.phase1End) / Math.max(1, dur) };
  }
  if (frameOffset < timing.phase3End) {
    const dur = timing.phase3End - timing.phase2End;
    return { phase: 3, phaseProgress: (frameOffset - timing.phase2End) / Math.max(1, dur) };
  }
  return { phase: 'done', phaseProgress: 1 };
}
