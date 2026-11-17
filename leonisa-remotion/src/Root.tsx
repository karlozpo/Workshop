import React from 'react';
import {Composition} from 'remotion';
import {LeonisaCover, DURATION, FPS} from './LeonisaCover';
import manifest from './manifest.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LeonisaCover"
    component={LeonisaCover}
    durationInFrames={DURATION}
    fps={FPS}
    // misma proporción que el PDF (487.56 x 751.18 pt)
    width={manifest.video.width}
    height={manifest.video.height}
  />
);
