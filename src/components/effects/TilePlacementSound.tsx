// Tile placement sound effects

import React from 'react';
import { Audio, Sequence } from 'remotion';

interface TilePlacementSoundProps {
  tileCount: number;
  startFrame: number;
  staggerFrames?: number;
  soundSrc?: string;
}

export const TilePlacementSound: React.FC<TilePlacementSoundProps> = ({
  tileCount,
  startFrame,
  staggerFrames = 8,
  soundSrc = '/sounds/tile-click.mp3',
}) => {
  return (
    <>
      {Array.from({ length: tileCount }).map((_, index) => {
        const tileStartFrame = startFrame + index * staggerFrames;
        return (
          <Sequence key={index} from={tileStartFrame} layout="none">
            <Audio
              src={soundSrc}
              volume={0.3}
              startFrom={0}
            />
          </Sequence>
        );
      })}
    </>
  );
};
