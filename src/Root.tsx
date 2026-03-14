import "./index.css";
import { Composition } from "remotion";
import { z } from "zod";
import { GameAnalysisVideo } from "./compositions/GameAnalysisVideo";
import { videoConfigSchema } from "./schemas/video-config.schema";
import { getAudioDuration, secondsToFrames } from "./lib/audio-utils";
import { convertSnakeCaseGameHistory } from "./lib/proto-utils";

// Import real game data
import frentzGameData from "./games/vs-frentz-league.json";
import frentzTimingScript from "./games/vs-frentz-league-timing-full.json";

// Extract the game history from the nested structure and convert to proto format
const gameHistory = convertSnakeCaseGameHistory(frentzGameData.history);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GameAnalysis"
        component={GameAnalysisVideo}
        durationInFrames={300} // Will be calculated dynamically
        fps={30}
        width={1920}
        height={1080}
        schema={videoConfigSchema}
        defaultProps={{
          gameHistory: gameHistory,
          voiceoverSrc: undefined, // Optional - no voiceover for now
          timingScript: frentzTimingScript,
          tileColor: "yellow" as const,
          boardColor: "slate" as const,
          highlightMoves: [3], // Highlight the bingo move (INCENSE)
          viewMode: "broadcast" as const, // Switch to "broadcast" for top-down view
        }}
        calculateMetadata={async ({ props }) => {
          // Calculate video duration based on timing script
          const INTRO_DURATION = 150; // 5 seconds at 30fps
          const OUTRO_DURATION = 180; // 6 seconds at 30fps

          // If no voiceover, calculate duration from timing script
          if (!props.voiceoverSrc) {
            // Find the last cue time and add buffer
            const lastCueTime = Math.max(
              ...props.timingScript.cues.map((c) => c.time),
            );
            const boardDurationFrames = Math.ceil((lastCueTime + 5) * 30); // +5 seconds buffer
            const totalFrames = INTRO_DURATION + boardDurationFrames;
            return {
              durationInFrames: totalFrames,
              props,
            };
          }

          try {
            // Get audio duration in seconds
            const audioDurationSeconds = await getAudioDuration(
              props.voiceoverSrc,
            );
            const audioFrames = secondsToFrames(audioDurationSeconds, 30);

            // Total duration = intro + audio + outro
            const totalFrames = INTRO_DURATION + audioFrames + OUTRO_DURATION;

            return {
              durationInFrames: totalFrames,
              props,
            };
          } catch (error) {
            console.warn(
              "Could not determine audio duration, using default:",
              error,
            );
            // Fallback to default duration if audio file doesn't exist
            const totalFrames =
              INTRO_DURATION + DEFAULT_BOARD_DURATION + OUTRO_DURATION;
            return {
              durationInFrames: totalFrames,
              props,
            };
          }
        }}
      />
    </>
  );
};
