// Main game analysis video composition

import React, { useMemo } from 'react';
import { Audio, Sequence } from 'remotion';
import { VideoConfig } from '../schemas/video-config.schema';
import { convertGameHistoryToStates } from '../lib/game-converter';
import { IntroScene } from '../scenes/IntroScene';
import { BoardScene } from '../scenes/BoardScene';
import { BroadcastScene } from '../scenes/BroadcastScene';
import { OutroScene } from '../scenes/OutroScene';

interface GameAnalysisVideoProps extends VideoConfig {}

export const GameAnalysisVideo: React.FC<GameAnalysisVideoProps> = ({
  gameHistory,
  voiceoverSrc,
  timingScript,
  tileColor,
  boardColor,
  highlightMoves,
  viewMode = 'cinematic',
}) => {
  // Convert game history to board states
  const boardStates = useMemo(() => {
    return convertGameHistoryToStates(gameHistory);
  }, [gameHistory]);

  // Scene durations (in frames at 30fps)
  const INTRO_DURATION = 150; // 5 seconds
  const OUTRO_DURATION = 180; // 6 seconds

  return (
    <>
      {/* Intro Scene */}
      <Sequence durationInFrames={INTRO_DURATION}>
        <IntroScene gameHistory={gameHistory} />
      </Sequence>

      {/* Board Scene - offset by intro duration */}
      <Sequence from={INTRO_DURATION}>
        {viewMode === 'broadcast' ? (
          <BroadcastScene
            boardStates={boardStates}
            timingScript={timingScript}
            tileColor={tileColor}
            boardColor={boardColor}
          />
        ) : (
          <BoardScene
            boardStates={boardStates}
            timingScript={timingScript}
            tileColor={tileColor}
            boardColor={boardColor}
          />
        )}
      </Sequence>

      {/* Optional voiceover audio */}
      {voiceoverSrc && (
        <Sequence from={INTRO_DURATION}>
          <Audio src={voiceoverSrc} />
        </Sequence>
      )}
    </>
  );
};
